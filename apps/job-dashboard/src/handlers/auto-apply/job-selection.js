import { calculateMatchScore } from './match-scoring.js';
import { appendDecisionTrace } from './decision-trace.js';

export function createSearchResults() {
  return {
    searched: 0,
    matched: 0,
    applied: 0,
    skipped: 0,
    errors: 0,
    searchAttempts: 0,
    searchFailures: 0,
    errorDetails: [],
    jobs: [],
    byPlatform: {},
  };
}

export function selectMatchedJobs({ allJobs, searchKeywords, minScore, searchResults }) {
  const scoredJobs = allJobs.map((job) => {
    const providedScore = Number.isFinite(job.matchScore) ? job.matchScore : null;
    const matchScore = providedScore ?? calculateMatchScore(job, { keywords: searchKeywords });
    return appendDecisionTrace(
      {
        ...job,
        matchScore,
      },
      {
        stage: 'scored',
        outcome: matchScore >= minScore ? 'matched' : 'filtered',
        reason: matchScore >= minScore ? 'score_meets_threshold' : 'score_below_threshold',
        score: matchScore,
        threshold: minScore,
      }
    );
  });

  const matchedJobs = scoredJobs
    .filter((job) => job.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore);

  searchResults.searched = allJobs.length;
  searchResults.matched = matchedJobs.length;

  for (const job of matchedJobs) {
    if (job.source && searchResults.byPlatform[job.source]) {
      searchResults.byPlatform[job.source].matched++;
    }
  }

  return matchedJobs;
}

import { calculateMatchScore } from './match-scoring.js';

export function createSearchResults() {
  return {
    searched: 0,
    matched: 0,
    applied: 0,
    skipped: 0,
    errors: 0,
    jobs: [],
    byPlatform: {},
  };
}

export function selectMatchedJobs({ allJobs, searchKeywords, minScore, searchResults }) {
  const scoredJobs = allJobs.map((job) => ({
    ...job,
    matchScore: calculateMatchScore(job, { keywords: searchKeywords }),
  }));

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

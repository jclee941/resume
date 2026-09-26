import { calculateMatchScore } from './match-scoring.js';
import { appendDecisionTrace } from './decision-trace.js';

/**
 * @typedef {{
 *   searched: number;
 *   matched: number;
 *   applied: number;
 *   [key: string]: unknown;
 * }} PlatformStats
 *
 * @typedef {{
 *   platform: string;
 *   keyword: string;
 *   message: string;
 *   errorCode?: string | number;
 * }} SearchErrorDetail
 *
 * One results object is shared by search, selection, and application steps.
 * @typedef {{
 *   searched: number;
 *   matched: number;
 *   applied: number;
 *   skipped: number;
 *   errors: number;
 *   searchAttempts: number;
 *   searchFailures: number;
 *   errorDetails: SearchErrorDetail[];
 *   jobs: Array<Record<string, unknown>>;
 *   byPlatform: Record<string, PlatformStats>;
 * }} SearchResults
 *
 * @typedef {import('./match-scoring.js').ScorableJob & {
 *   source?: string;
 *   matchScore?: number;
 *   [key: string]: unknown;
 * }} JobCandidate
 */

/**
 * @returns {SearchResults}
 */
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

// `profile` is the loadMatchingConfig() matching profile the Workflows score with;
// calculateMatchScore ignores search keywords, which capped every score below minScore.
/**
 * @template {JobCandidate} T
 * @param {{
 *   allJobs: T[];
 *   profile: import('./match-scoring.js').MatchScoringConfig;
 *   minScore: number;
 *   searchResults: SearchResults;
 * }} options
 * @returns {(T & { matchScore: number; decisionTrace: unknown[] })[]}
 */
export function selectMatchedJobs({ allJobs, profile, minScore, searchResults }) {
  const scoredJobs = allJobs.map((job) => {
    const providedScore = Number.isFinite(job.matchScore) ? job.matchScore : null;
    const matchScore = providedScore ?? calculateMatchScore(job, profile);
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

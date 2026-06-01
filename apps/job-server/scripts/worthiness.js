/**
 * Worthiness filtering for "지원할만한 공고" (jobs worth applying to).
 *
 * A job is worthy when its match score is >= the threshold. Jobs with no
 * score are dropped (we cannot prove worthiness). Worthy jobs are returned
 * sorted by score descending so the best postings are sent first.
 */

/** Default "worth applying" threshold (matches JobMatcher REVIEW_THRESHOLD). */
export const WORTHY_MIN_SCORE = 60;

/** Resolve a job's match score from the various field names in use. */
function scoreOf(job) {
  const raw = job?.matchPercentage ?? job?.match_percentage ?? job?.matchScore ?? job?.score;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Keep only jobs scoring >= minScore, sorted best-first.
 *
 * @param {Array<object>} jobs
 * @param {number} [minScore=WORTHY_MIN_SCORE]
 * @returns {Array<object>}
 */
export function filterWorthy(jobs, minScore = WORTHY_MIN_SCORE) {
  if (!Array.isArray(jobs)) return [];
  return jobs
    .map((job) => ({ job, score: scoreOf(job) }))
    .filter(({ score }) => score != null && score >= minScore)
    .sort((a, b) => b.score - a.score)
    .map(({ job }) => job);
}

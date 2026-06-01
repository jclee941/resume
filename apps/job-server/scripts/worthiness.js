/**
 * Worthiness filtering for "지원할만한 공고" (jobs worth applying to).
 *
 * A job is worthy when its match score is >= the threshold. Worthy jobs are
 * returned sorted by score descending so the best postings are sent first.
 *
 * Unscored jobs: by default they are dropped (we cannot prove worthiness from a
 * crawl). Pass { keepUnscored: true } for hand-curated queue sources where the
 * absence of a score means "already vetted" rather than "unknown".

/** Default "worth applying" threshold (matches JobMatcher REVIEW_THRESHOLD). */
export const WORTHY_MIN_SCORE = 60;

/** Resolve a job's match score from the various field names in use. */
function scoreOf(job) {
  const raw = job?.matchPercentage ?? job?.match_percentage ?? job?.matchScore ?? job?.score;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Keep worthy jobs, sorted best-first.
 *
 * @param {Array<object>} jobs
 * @param {number} [minScore=WORTHY_MIN_SCORE]
 * @param {{keepUnscored?: boolean}} [options]
 * @returns {Array<object>}
 */
export function filterWorthy(jobs, minScore = WORTHY_MIN_SCORE, options = {}) {
  if (!Array.isArray(jobs)) return [];
  const keepUnscored = options.keepUnscored === true;
  return jobs
    .map((job) => ({ job, score: scoreOf(job) }))
    .filter(({ score }) => {
      if (score == null) return keepUnscored; // curated queue: unscored = vetted
      return score >= minScore;
    })
    // Scored jobs sort by score desc; unscored (kept) sort last, original order.
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .map(({ job }) => job);
}

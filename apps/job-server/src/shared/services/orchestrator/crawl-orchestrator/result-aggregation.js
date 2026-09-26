/**
 * @fileoverview Result aggregation for crawl orchestration.
 */

/**
 * @typedef {Object} PlatformJob
 * @property {string} [company]
 * @property {string} [position]
 * @property {string} [title]
 * @property {Record<string, unknown>} [extra]
 */

/**
 * @typedef {Object} PlatformResultError
 * @property {string} [message]
 * @property {number | string} [code]
 * @property {Record<string, unknown>} [details]
 */

/**
 * @typedef {Object} PlatformResult
 * @property {string} [platform]
 * @property {'success' | 'error' | 'cancelled' | string} status
 * @property {PlatformJob[]} jobs
 * @property {PlatformResultError | null} [error]
 * @property {number} durationMs
 */

/**
 * @typedef {Object} CrawlOrchestratorOptions
 * @property {boolean} [deduplicate]
 * @property {number} [concurrency]
 */

/**
 * @typedef {Object} PlatformSummary
 * @property {string} status
 * @property {number} jobCount
 * @property {number} durationMs
 * @property {PlatformResultError | null | undefined} error
 */

/**
 * @typedef {Object} CrawlResult
 * @property {PlatformJob[]} jobs
 * @property {number} totalJobs
 * @property {Record<string, PlatformSummary>} platforms
 * @property {Array<PlatformResultError & { platform: string }>} errors
 * @property {boolean} hasErrors
 * @property {object} metrics
 */

/**
 * Aggregate results from all platforms.
 *
 * @param {Map<string, PlatformResult>} results
 * @param {CrawlOrchestratorOptions} opts
 * @param {object} metrics
 * @returns {CrawlResult}
 */
export function aggregateResults(results, opts, metrics) {
  /** @type {PlatformJob[]} */
  let allJobs = [];
  /** @type {Record<string, PlatformSummary>} */
  const platformSummaries = {};
  /** @type {Array<PlatformResultError & { platform: string }>} */
  const errors = [];

  for (const [platform, result] of results) {
    platformSummaries[platform] = {
      status: result.status,
      jobCount: result.jobs.length,
      durationMs: result.durationMs,
      error: result.error,
    };

    if (result.status === 'success') {
      allJobs.push(...result.jobs);
    }

    if (result.error) {
      errors.push({ platform, ...result.error });
    }
  }

  if (opts.deduplicate && allJobs.length > 0) {
    allJobs = deduplicateJobs(allJobs);
  }

  return {
    jobs: allJobs,
    totalJobs: allJobs.length,
    platforms: platformSummaries,
    errors,
    hasErrors: errors.length > 0,
    metrics,
  };
}

/**
 * Deduplicate jobs by company and title/position.
 *
 * @param {PlatformJob[]} jobs
 * @returns {PlatformJob[]}
 */
export function deduplicateJobs(jobs) {
  const seen = new Set();

  return jobs.filter((job) => {
    const key = `${(job.company || '').toLowerCase()}|${(job.position || job.title || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

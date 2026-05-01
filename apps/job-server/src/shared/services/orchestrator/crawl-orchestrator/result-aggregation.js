/**
 * @fileoverview Result aggregation for crawl orchestration.
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
  let allJobs = [];
  const platformSummaries = {};
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
 * @param {object[]} jobs
 * @returns {object[]}
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

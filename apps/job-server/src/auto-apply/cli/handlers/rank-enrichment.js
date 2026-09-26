/**
 * @typedef {object} EnrichmentStat
 * @property {number} success
 * @property {number} empty
 * @property {number} failed
 * @property {number} skipped
 */

/**
 * @typedef {object} EnrichableJob
 * @property {string | number} [id]
 * @property {string} [source]
 * @property {string} [description]
 * @property {string} [requirements]
 * @property {string[]} [techStack]
 * @property {string} [benefits]
 * @property {string} [preferredPoints]
 * @property {string} [company]
 * @property {string} [position]
 * @property {string} [enrichmentStatus]
 * @property {string} [enrichmentError]
 */

/**
 * @typedef {object} JobDetailPayload
 * @property {boolean} [success]
 * @property {EnrichableJob} [job]
 * @property {string} [description]
 * @property {string} [requirements]
 * @property {string[]} [techStack]
 * @property {string} [benefits]
 * @property {string} [preferredPoints]
 */

/**
 * @typedef {object} CrawlerWithDetail
 * @property {(id: string | number) => Promise<JobDetailPayload>} getJobDetail
 */

/**
 * @param {Record<string, EnrichmentStat>} stats
 * @param {string | undefined} source
 * @param {'success' | 'empty' | 'failed' | 'skipped'} status
 */
function recordStat(stats, source, status) {
  const key = source || 'unknown';
  if (!stats[key]) stats[key] = { success: 0, empty: 0, failed: 0, skipped: 0 };
  stats[key][status] += 1;
}

/**
 * @template {EnrichableJob} T
 * @param {T} job
 * @param {JobDetailPayload | null | undefined} detail
 * @returns {T}
 */
export function mergeDetailIntoJob(job, detail) {
  if (!detail || detail.success === false) return job;
  const d = detail.job || detail;
  /**
   * @param {string | undefined} a
   * @param {string | undefined} b
   * @returns {string | undefined}
   */
  const longest = (a, b) => ((b || '').length > (a || '').length ? b : a);
  return {
    ...job,
    description: job.description && job.description.length ? job.description : d.description || '',
    requirements:
      job.requirements && job.requirements.length ? job.requirements : d.requirements || '',
    techStack:
      Array.isArray(job.techStack) && job.techStack.length
        ? job.techStack
        : Array.isArray(d.techStack)
          ? d.techStack
          : [],
    benefits: longest(job.benefits, d.benefits),
    preferredPoints: longest(job.preferredPoints, d.preferredPoints),
  };
}

/**
 * @template {EnrichableJob} T
 * @param {CrawlerWithDetail} crawler
 * @param {T[]} jobs
 * @returns {Promise<{ jobs: (T & { enrichmentStatus: string, enrichmentError?: string })[], stats: Record<string, EnrichmentStat> }>}
 */
export async function enrichTopJobs(crawler, jobs) {
  const enriched = [];
  /** @type {Record<string, EnrichmentStat>} */
  const stats = {};
  for (const job of jobs) {
    const hasText = (job.description || '').length > 0 || (job.requirements || '').length > 0;
    if (hasText || !job.id) {
      recordStat(stats, job.source, 'skipped');
      enriched.push({ ...job, enrichmentStatus: 'skipped' });
      continue;
    }
    try {
      const detail = await crawler.getJobDetail(job.id);
      const merged = mergeDetailIntoJob(job, detail);
      const ok = (merged.description || '').length || (merged.requirements || '').length;
      const status = ok ? 'success' : 'empty';
      recordStat(stats, job.source, status);
      enriched.push({ ...merged, enrichmentStatus: status });
    } catch (error) {
      recordStat(stats, job.source, 'failed');
      enriched.push({
        ...job,
        enrichmentStatus: 'failed',
        enrichmentError: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { jobs: enriched, stats };
}

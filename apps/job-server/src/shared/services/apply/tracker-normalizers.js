/**
 * @typedef {{
 *   id?: string | number | null;
 *   job_id?: string | number | null;
 *   jobId?: string | number | null;
 *   source?: string | null;
 *   platform?: string | null;
 *   sourceUrl?: string | null;
 *   source_url?: string | null;
 *   url?: string | null;
 *   position?: string | null;
 *   title?: string | null;
 *   company?: string | null;
 *   companyName?: string | null;
 *   location?: string | null;
 *   priority?: string | null;
 *   applicationPriority?: string | null;
 *   [key: string]: unknown;
 * }} RawTrackerJob
 *
 * @typedef {{
 *   jobId: string | number | null;
 *   source: string;
 *   sourceUrl: string | null;
 *   position: string;
 *   company: string;
 *   location: string | null;
 *   priority: string;
 * }} NormalizedTrackerJob
 */

/**
 * @param {unknown} [value]
 * @returns {string}
 */
export function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const parsed = new Date(/** @type {string | number} */ (value));
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

/**
 * @param {RawTrackerJob} [job]
 * @returns {NormalizedTrackerJob}
 */
export function normalizeJob(job = {}) {
  return {
    jobId: job.id ?? job.job_id ?? job.jobId ?? null,
    source: job.source ?? job.platform ?? 'manual',
    sourceUrl: job.sourceUrl ?? job.source_url ?? job.url ?? null,
    position: job.position ?? job.title ?? 'Unknown Position',
    company: job.company ?? job.companyName ?? 'Unknown Company',
    location: job.location ?? null,
    priority: job.priority ?? job.applicationPriority ?? 'medium',
  };
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function normalizeMatchScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const score = Number(value);
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

/**
 * @param {string | { coverLetter?: unknown } | null | undefined} [coverLetter]
 * @returns {string}
 */
export function normalizeCoverLetterValue(coverLetter) {
  if (!coverLetter) return '';
  if (typeof coverLetter === 'string') return coverLetter;
  if (typeof coverLetter.coverLetter === 'string') return coverLetter.coverLetter;
  return String(coverLetter);
}

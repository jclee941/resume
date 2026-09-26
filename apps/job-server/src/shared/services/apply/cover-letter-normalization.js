const KOREAN_CHAR_PATTERN = /[가-힣]/g;
const ENGLISH_CHAR_PATTERN = /[a-zA-Z]/g;

export const DEFAULT_COVER_LETTER_OPTIONS = {
  language: 'auto',
  style: 'professional',
  useAI: true,
  cacheEnabled: true,
};

/**
 * @typedef {{
 *   id?: string | number;
 *   job_id?: string | number;
 *   jobId?: string | number;
 *   sourceId?: string | number;
 *   position?: unknown;
 *   title?: unknown;
 *   description?: unknown;
 *   detail?: unknown;
 *   preferred?: unknown;
 *   benefits?: unknown;
 *   intro?: unknown;
 *   requirements?: unknown;
 *   company?: { name?: unknown; [key: string]: unknown };
 *   [key: string]: unknown;
 * }} NormalizableJob
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export function toSafeString(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * @param {NormalizableJob | null | undefined} job
 * @returns {string | number | null}
 */
export function normalizeJobId(job) {
  return job?.id ?? job?.job_id ?? job?.jobId ?? job?.sourceId ?? null;
}

/**
 * @param {NormalizableJob} [job]
 * @returns {string}
 */
export function detectJobLanguage(job) {
  const text = buildJobText(job);
  const koreanCount = (text.match(KOREAN_CHAR_PATTERN) || []).length;
  const englishCount = (text.match(ENGLISH_CHAR_PATTERN) || []).length;

  if (koreanCount === 0 && englishCount === 0) {
    return 'en';
  }

  return koreanCount >= englishCount ? 'ko' : 'en';
}

/**
 * @param {NormalizableJob} [job]
 * @returns {string}
 */
function buildJobText(job = {}) {
  const parts = [
    job.position,
    job.title,
    job.description,
    job.detail,
    job.preferred,
    job.benefits,
    job.intro,
    job.requirements,
    job.company?.name,
    job.company,
  ];

  return parts
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => toSafeString(value).trim())
    .filter(Boolean)
    .join(' ');
}

import { rememberFetch } from '../../services/remember/remember-fetch.js';
import {
  isAutoApplicable,
  searchRememberPostings,
  toRememberJob,
} from '../../services/remember/remember-jobs.js';

const MAX_REMEMBER_KEYWORDS = 5;

/**
 * @typedef {import('./platforms.js').PlatformJob} PlatformJob
 * @typedef {import('./platforms.js').PlatformSearchCriteria} PlatformSearchCriteria
 */

/**
 * @param {PlatformSearchCriteria} criteria
 * @returns {string[]}
 */
function rememberKeywords(criteria) {
  const raw = Array.isArray(criteria.keywords) ? criteria.keywords : [criteria.keyword];
  const trimmed = raw
    .filter((keyword) => typeof keyword === 'string')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  return [...new Set(trimmed)].slice(0, MAX_REMEMBER_KEYWORDS);
}

/**
 * Searches Remember once per keyword and keeps the open postings the profile can apply to on
 * its own, merged by posting id in first-seen order. Search results already carry the posting
 * text, so no detail call is needed for scoring. A failing keyword is logged and skipped; the
 * first error is thrown only when every query fails.
 * @param {{ env?: Record<string, unknown> }} ctx
 * @param {PlatformSearchCriteria} criteria
 * @returns {Promise<PlatformJob[]>}
 */
export async function searchRemember(ctx, criteria) {
  const keywords = rememberKeywords(criteria);
  const fetchImpl = rememberFetch(ctx?.env);
  /** @type {Map<string, PlatformJob>} */
  const merged = new Map();
  /** @type {unknown[]} */
  const errors = [];
  for (const keyword of keywords) {
    try {
      for (const posting of await searchRememberPostings(keyword, { fetchImpl })) {
        if (!isAutoApplicable(posting)) continue;
        const job = toRememberJob(posting);
        if (!merged.has(job.id)) merged.set(job.id, job);
      }
    } catch (error) {
      errors.push(error);
      console.warn(
        `[remember-search] query for "${keyword}" failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  if (keywords.length > 0 && errors.length === keywords.length) throw errors[0];
  return [...merged.values()];
}

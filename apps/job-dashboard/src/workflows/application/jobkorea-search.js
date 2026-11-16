import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { enrichJobKoreaJobs } from './jobkorea-detail.js';
import {
  offersImmediateApply,
  parseJobKoreaSearchPage,
  toJobKoreaJob,
} from './jobkorea-postings.js';

const JOBKOREA_SEARCH_URL = 'https://www.jobkorea.co.kr/Search/';
const MAX_JOBKOREA_KEYWORDS = 12;
const MAX_PAGES_PER_KEYWORD = 5;
const PAGE_TIMEOUT_MS = 20_000;

/**
 * @typedef {import('./platforms.js').PlatformJob} PlatformJob
 * @typedef {import('./platforms.js').PlatformSearchCriteria} PlatformSearchCriteria
 */

/**
 * @param {PlatformSearchCriteria} criteria
 * @returns {string[]}
 */
function jobKoreaKeywords(criteria) {
  const raw = Array.isArray(criteria.keywords) ? criteria.keywords : [criteria.keyword];
  const trimmed = raw
    .filter((keyword) => typeof keyword === 'string')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  return [...new Set(trimmed)].slice(0, MAX_JOBKOREA_KEYWORDS);
}

/**
 * The recruit tab of the search page with `filter=2` (즉시지원만 보기), so only postings that take
 * a JobKorea application are listed.
 * @param {string} keyword
 * @param {number} page
 * @returns {string}
 */
export function jobKoreaSearchUrl(keyword, page) {
  const params = new URLSearchParams({
    stext: keyword,
    tabType: 'recruit',
    Page_No: String(page),
    filter: '2',
  });
  return `${JOBKOREA_SEARCH_URL}?${params}`;
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchSearchPage(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`JobKorea search error: ${response.status}`);
  return response.text();
}

/**
 * Searches JobKorea once per keyword, paging until a page adds no new posting (at most
 * MAX_PAGES_PER_KEYWORD pages), and keeps the 즉시지원 postings merged by GI_No in first-seen order.
 * A keyword whose page fails is logged and skipped with the postings it already gave; the first
 * error is thrown only when every keyword fails. The leading jobs then get their posting text
 * (jobkorea-detail.js), since the search tags alone undercount the skills a posting asks for.
 * @param {{ env?: Record<string, unknown> }} _ctx
 * @param {PlatformSearchCriteria} criteria
 * @param {{ fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<PlatformJob[]>}
 */
export async function searchJobKorea(_ctx, criteria, { fetchImpl = fetch } = {}) {
  const keywords = jobKoreaKeywords(criteria);
  /** @type {Map<string, PlatformJob>} */
  const merged = new Map();
  /** @type {unknown[]} */
  const errors = [];
  for (const keyword of keywords) {
    try {
      for (let page = 1; page <= MAX_PAGES_PER_KEYWORD; page += 1) {
        const postings = parseJobKoreaSearchPage(
          await fetchSearchPage(fetchImpl, jobKoreaSearchUrl(keyword, page))
        );
        const sizeBefore = merged.size;
        for (const posting of postings) {
          if (!offersImmediateApply(posting)) continue;
          const job = toJobKoreaJob(posting);
          if (!merged.has(job.id)) merged.set(job.id, job);
        }
        if (postings.length === 0 || merged.size === sizeBefore) break;
      }
    } catch (error) {
      errors.push(error);
      console.warn(
        `[jobkorea-search] query for "${keyword}" failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  if (keywords.length > 0 && errors.length === keywords.length) throw errors[0];
  return enrichJobKoreaJobs([...merged.values()], fetchImpl);
}

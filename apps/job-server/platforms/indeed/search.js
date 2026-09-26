import { applyPaginationParams, buildPaginationResult } from './pagination.js';

/** Indeed Korea category mapping for common job types. */
export const INDEED_JOB_TYPES = {
  FULLTIME: 'fulltime',
  PARTTIME: 'parttime',
  CONTRACT: 'contract',
  TEMPORARY: 'temporary',
  INTERNSHIP: 'internship',
};

/** Indeed date posted filters. */
export const INDEED_DATE_POSTED = {
  LAST_24H: '1',
  LAST_3D: '3',
  LAST_7D: '7',
  LAST_14D: '14',
};

/**
 * @typedef {Object} IndeedSearchParams
 * @property {string} [keyword] - Search keyword/query
 * @property {string} [location] - Location filter
 * @property {string} [jobType] - Job type filter
 * @property {string} [datePosted] - Date posted filter
 * @property {number} [limit] - Max results per page
 * @property {number} [offset] - Pagination start index
 * @property {string} [sort] - Sort by: 'relevance' or 'date'
 */

/**
 * Build search query parameters for Indeed Korea.
 *
 * @param {IndeedSearchParams} params - Search parameters
 * @returns {string} URL query string
 */
export function buildSearchQuery(params) {
  const query = new URLSearchParams();

  if (params.keyword) {
    query.set('q', params.keyword);
  }

  if (params.location) {
    query.set('l', params.location);
  }

  if (params.jobType) {
    query.set('jt', params.jobType);
  }

  if (params.datePosted) {
    query.set('fromage', params.datePosted);
  }

  if (params.sort === 'date') {
    query.set('sort', 'date');
  }

  applyPaginationParams(query, params);
  return query.toString();
}

/**
 * @typedef {Object} IndeedCrawler
 * @property {string} apiBase
 * @property {(url: string) => Promise<string>} fetchHTML
 * @property {(html: string) => Record<string, unknown>[]} _parseSearchResults
 */

/**
 * Search jobs on Indeed Korea.
 *
 * @param {IndeedCrawler} crawler - Indeed crawler instance with apiBase/fetchHTML
 * @param {IndeedSearchParams} [params] - Search parameters
 * @returns {Promise<{success: boolean, source: string, total?: number, jobs: Record<string, unknown>[], error?: string}>}
 */
export async function searchJobs(crawler, params = {}) {
  const query = buildSearchQuery(params);
  const url = `${crawler.apiBase}/jobs?${query}`;

  try {
    const html = await crawler.fetchHTML(url);
    const jobs = crawler._parseSearchResults(html);
    const limit = params.limit || 15;

    return {
      success: true,
      source: 'indeed',
      total: jobs.length,
      ...buildPaginationResult(jobs, params),
      jobs: jobs.slice(0, limit),
    };
  } catch (error) {
    return {
      success: false,
      source: 'indeed',
      error: error instanceof Error ? error.message : String(error),
      jobs: [],
    };
  }
}

/**
 * Search by keyword convenience wrapper.
 *
 * @param {IndeedCrawler} crawler - Indeed crawler instance
 * @param {string} keyword - Search keyword
 * @param {IndeedSearchParams} [options] - Additional search options
 * @returns {Promise<{success: boolean, source: string, total?: number, jobs: Record<string, unknown>[], error?: string}>}
 */
export function searchByKeyword(crawler, keyword, options = {}) {
  return searchJobs(crawler, { ...options, keyword });
}

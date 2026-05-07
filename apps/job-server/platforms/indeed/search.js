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
 * Build search query parameters for Indeed Korea.
 *
 * @param {object} params - Search parameters
 * @param {string} [params.keyword] - Search keyword/query
 * @param {string} [params.location] - Location filter
 * @param {string} [params.jobType] - Job type filter
 * @param {string} [params.datePosted] - Date posted filter
 * @param {number} [params.limit] - Max results per page
 * @param {number} [params.offset] - Pagination start index
 * @param {string} [params.sort] - Sort by: 'relevance' or 'date'
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
 * Search jobs on Indeed Korea.
 *
 * @param {object} crawler - Indeed crawler instance with apiBase/fetchHTML
 * @param {object} params - Search parameters
 * @returns {Promise<{success: boolean, source: string, total?: number, jobs: object[], error?: string}>}
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
      error: error.message,
      jobs: [],
    };
  }
}

/**
 * Search by keyword convenience wrapper.
 *
 * @param {object} crawler - Indeed crawler instance
 * @param {string} keyword - Search keyword
 * @param {object} options - Additional search options
 * @returns {Promise<object>}
 */
export function searchByKeyword(crawler, keyword, options = {}) {
  return searchJobs(crawler, { ...options, keyword });
}

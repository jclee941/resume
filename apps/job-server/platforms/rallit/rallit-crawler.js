import { BaseCrawler } from '../../src/crawlers/base-crawler.js';

/**
 * @typedef {{ keyword?: string, offset?: number, limit?: number, jobGroup?: string }} RallitSearchParams
 * @typedef {{
 *   id?: string | number, positionId?: string | number,
 *   title?: string, positionName?: string, companyName?: string,
 *   company?: { name?: string }, location?: string, address?: string,
 *   description?: string, content?: string, skills?: string[], techStacks?: string[],
 *   salary?: string | number, createdAt?: string | null, publishedAt?: string | null,
 *   closedAt?: string | null, deadline?: string | null
 * }} RawRallitJob
 * @typedef {{ content?: RawRallitJob[], data?: RawRallitJob[], totalElements?: number, total?: number, last?: boolean | null }} RallitSearchResponse
 * @typedef {RawRallitJob & { data?: RawRallitJob }} RallitDetailResponse
 */

/**
 * Rallit (rallit.com) job platform crawler.
 * Korean IT career platform with developer-focused jobs.
 * @extends BaseCrawler
 */
export class RallitCrawler extends BaseCrawler {
  /**
   * @param {import('../../src/crawlers/base-crawler.js').BaseCrawlerOptions} [options] - Crawler options
   * @param {number} [options.rateLimit=1200] - Rate limit in ms between requests
   */
  constructor(options = {}) {
    super('rallit', {
      baseUrl: 'https://www.rallit.com',
      rateLimit: 1200,
      ...options,
    });
    this.source = 'rallit';
  }

  /**
   * Build search query URL from parameters.
   * @param {RallitSearchParams} params - Search parameters
   * @param {string} [params.keyword] - Search keyword
   * @param {number} [params.offset=0] - Pagination offset
   * @param {number} [params.limit=20] - Results per page
   * @param {string} [params.jobGroup] - Job group filter
   * @returns {string} Query URL
   */
  buildSearchQuery(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.set('keyword', params.keyword);
    searchParams.set('pageNumber', String(Math.floor((params.offset || 0) / (params.limit || 20))));
    searchParams.set('pageSize', String(params.limit || 20));
    if (params.jobGroup) searchParams.set('jobGroup', params.jobGroup);
    searchParams.set('order', 'RECENT');
    return searchParams.toString();
  }

  /**
   * Search for jobs on Rallit.
   * @param {RallitSearchParams} params - Search parameters
   * @returns {Promise<{success: true, source: string, total: number, hasMore: boolean, nextOffset: number, jobs: ReturnType<RallitCrawler['normalizeJob']>[]} | {success: false, source: string, error: string, jobs: []}>}
   */
  async searchJobs(params = {}) {
    try {
      const query = this.buildSearchQuery(params);
      const url = `${this.baseUrl}/api/positions?${query}`;
      const result = /** @type {RallitSearchResponse} */ (await this.fetchJSON(url));
      const positions = result.content || result.data || [];
      const jobs = positions.map((job) => this.normalizeJob(job));

      return {
        success: true,
        source: this.source,
        total: result.totalElements || result.total || jobs.length,
        hasMore: !(result.last ?? true),
        nextOffset: (params.offset || 0) + jobs.length,
        jobs,
      };
    } catch (error) {
      return {
        success: false,
        source: this.source,
        error: error instanceof Error ? error.message : String(error),
        jobs: [],
      };
    }
  }

  /**
   * Normalize a Rallit job object to common format.
   * @param {RawRallitJob} job - Raw Rallit job data
   * @returns Normalized job
   */
  normalizeJob(job) {
    return {
      id: `rallit-${job.id || job.positionId}`,
      source: this.source,
      title: job.title || job.positionName || '',
      company: job.companyName || job.company?.name || '',
      location: job.location || job.address || '서울',
      url: `${this.baseUrl}/positions/${job.id || job.positionId}`,
      description: job.description || job.content || '',
      skills: job.skills || job.techStacks || [],
      salary: job.salary || null,
      postedAt: job.createdAt || job.publishedAt || null,
      deadline: job.closedAt || job.deadline || null,
    };
  }

  /**
   * Get detailed job information.
   * @param {string} jobId - Job identifier
   * @returns {Promise<{success: true, job: ReturnType<RallitCrawler['normalizeJob']>} | {success: false, error: string}>} Job detail
   */
  async getJobDetail(jobId) {
    try {
      const numericId = jobId.replace('rallit-', '');
      const url = `${this.baseUrl}/api/positions/${numericId}`;
      const result = /** @type {RallitDetailResponse} */ (await this.fetchJSON(url));
      return { success: true, job: this.normalizeJob(result.data || result) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

export default RallitCrawler;

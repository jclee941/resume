import { BaseCrawler } from '../../src/crawlers/base-crawler.js';

/**
 * @typedef {{ keyword?: string, offset?: number, limit?: number, location?: string, career?: string }} RocketPunchSearchParams
 * @typedef {{
 *   id?: string | number, job_id?: string | number,
 *   title?: string, job_title?: string, company_name?: string,
 *   company?: { name?: string }, location?: string, address?: string,
 *   description?: string, content?: string, skills?: string[], tech_stacks?: string[],
 *   salary?: string | number, compensation?: string | number,
 *   created_at?: string | null, published_at?: string | null,
 *   deadline?: string | null, expires_at?: string | null
 * }} RawRocketPunchJob
 * @typedef {{ data?: RawRocketPunchJob[], total?: number, page?: number, total_pages?: number }} RocketPunchSearchResponse
 * @typedef {RawRocketPunchJob & { data?: RawRocketPunchJob }} RocketPunchDetailResponse
 */

/**
 * RocketPunch (rocketpunch.com) job platform crawler.
 * Supports Korean tech job search and application automation.
 * @extends BaseCrawler
 */
export class RocketPunchCrawler extends BaseCrawler {
  /**
   * @param {import('../../src/crawlers/base-crawler.js').BaseCrawlerOptions} [options] - Crawler options
   * @param {number} [options.rateLimit=1500] - Rate limit in ms between requests
   */
  constructor(options = {}) {
    super('rocketpunch', {
      baseUrl: 'https://www.rocketpunch.com',
      rateLimit: 1500,
      ...options,
    });
    this.source = 'rocketpunch';
  }

  /**
   * Build search query URL from parameters.
   * @param {RocketPunchSearchParams} params - Search parameters
   * @param {string} [params.keyword] - Search keyword
   * @param {number} [params.offset=0] - Pagination offset
   * @param {number} [params.limit=20] - Results per page
   * @param {string} [params.location] - Job location filter
   * @param {string} [params.career] - Career level filter
   * @returns {string} Query URL
   */
  buildSearchQuery(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.set('keywords', params.keyword);
    if (params.offset)
      searchParams.set('page', String(Math.floor(params.offset / (params.limit || 20)) + 1));
    if (params.location) searchParams.set('location', params.location);
    if (params.career) searchParams.set('career_type', params.career);
    return searchParams.toString();
  }

  /**
   * Search for jobs on RocketPunch.
   * @param {RocketPunchSearchParams} params - Search parameters
   * @returns {Promise<{success: true, source: string, total: number, hasMore: boolean, nextOffset: number, jobs: ReturnType<RocketPunchCrawler['normalizeJob']>[]} | {success: false, source: string, error: string, jobs: []}>}
   */
  async searchJobs(params = {}) {
    try {
      const query = this.buildSearchQuery(params);
      const url = `${this.baseUrl}/api/v1/hiring/jobs?${query}`;
      const result = /** @type {RocketPunchSearchResponse} */ (await this.fetchJSON(url));
      const jobs = (result.data || []).map((job) => this.normalizeJob(job));

      return {
        success: true,
        source: this.source,
        total: result.total || jobs.length,
        hasMore: (result.page || 1) < (result.total_pages || 1),
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
   * Normalize a RocketPunch job object to common format.
   * @param {RawRocketPunchJob} job - Raw RocketPunch job data
   * @returns Normalized job
   */
  normalizeJob(job) {
    return {
      id: `rocketpunch-${job.id || job.job_id}`,
      source: this.source,
      title: job.title || job.job_title || '',
      company: job.company_name || job.company?.name || '',
      location: job.location || job.address || '서울',
      url: `${this.baseUrl}/jobs/${job.id || job.job_id}`,
      description: job.description || job.content || '',
      skills: job.skills || job.tech_stacks || [],
      salary: job.salary || job.compensation || null,
      postedAt: job.created_at || job.published_at || null,
      deadline: job.deadline || job.expires_at || null,
    };
  }

  /**
   * Get detailed job information.
   * @param {string} jobId - Job identifier
   * @returns {Promise<{success: true, job: ReturnType<RocketPunchCrawler['normalizeJob']>} | {success: false, error: string}>} Job detail
   */
  async getJobDetail(jobId) {
    try {
      const numericId = jobId.replace('rocketpunch-', '');
      const url = `${this.baseUrl}/api/v1/hiring/jobs/${numericId}`;
      const result = /** @type {RocketPunchDetailResponse} */ (await this.fetchJSON(url));
      return { success: true, job: this.normalizeJob(result.data || result) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

export default RocketPunchCrawler;

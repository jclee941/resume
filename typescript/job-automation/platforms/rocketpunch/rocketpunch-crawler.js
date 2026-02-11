import { BaseCrawler } from '../../src/crawlers/base-crawler.js';

/**
 * RocketPunch (rocketpunch.com) job platform crawler.
 * Supports Korean tech job search and application automation.
 * @extends BaseCrawler
 */
export class RocketPunchCrawler extends BaseCrawler {
  /**
   * @param {Object} [options] - Crawler options
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
   * @param {Object} params - Search parameters
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
      searchParams.set('page', Math.floor(params.offset / (params.limit || 20)) + 1);
    if (params.location) searchParams.set('location', params.location);
    if (params.career) searchParams.set('career_type', params.career);
    return searchParams.toString();
  }

  /**
   * Search for jobs on RocketPunch.
   * @param {Object} params - Search parameters
   * @returns {Promise<{success: boolean, source: string, total: number, hasMore: boolean, jobs: Array}>}
   */
  async searchJobs(params = {}) {
    try {
      const query = this.buildSearchQuery(params);
      const url = `${this.baseUrl}/api/v1/hiring/jobs?${query}`;
      const data = await this.rateLimitedFetch(url);
      const result = typeof data === 'string' ? JSON.parse(data) : data;
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
      return { success: false, source: this.source, error: error.message, jobs: [] };
    }
  }

  /**
   * Normalize a RocketPunch job object to common format.
   * @param {Object} job - Raw RocketPunch job data
   * @returns {Object} Normalized job
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
   * @returns {Promise<Object>} Job detail
   */
  async getJobDetail(jobId) {
    try {
      const numericId = jobId.replace('rocketpunch-', '');
      const url = `${this.baseUrl}/api/v1/hiring/jobs/${numericId}`;
      const data = await this.rateLimitedFetch(url);
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: true, job: this.normalizeJob(result.data || result) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default RocketPunchCrawler;

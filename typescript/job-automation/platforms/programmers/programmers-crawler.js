import { BaseCrawler } from '../../src/crawlers/base-crawler.js';

/**
 * Programmers (programmers.co.kr) job platform crawler.
 * Kakao-backed Korean developer job platform.
 * @extends BaseCrawler
 */
export class ProgrammersCrawler extends BaseCrawler {
  /**
   * @param {Object} [options] - Crawler options
   * @param {number} [options.rateLimit=1200] - Rate limit in ms between requests
   */
  constructor(options = {}) {
    super('programmers', {
      baseUrl: 'https://career.programmers.co.kr',
      rateLimit: 1200,
      ...options,
    });
    this.source = 'programmers';
  }

  /**
   * Build search query URL from parameters.
   * @param {Object} params - Search parameters
   * @param {string} [params.keyword] - Search keyword
   * @param {number} [params.offset=0] - Pagination offset
   * @param {number} [params.limit=20] - Results per page
   * @param {string} [params.category] - Job category filter
   * @returns {string} Query URL
   */
  buildSearchQuery(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.set('query', params.keyword);
    if (params.offset)
      searchParams.set('page', Math.floor(params.offset / (params.limit || 20)) + 1);
    if (params.limit) searchParams.set('size', params.limit);
    if (params.category) searchParams.set('category', params.category);
    searchParams.set('order', 'recent');
    return searchParams.toString();
  }

  /**
   * Search for jobs on Programmers.
   * @param {Object} params - Search parameters
   * @returns {Promise<{success: boolean, source: string, total: number, hasMore: boolean, jobs: Array}>}
   */
  async searchJobs(params = {}) {
    try {
      const query = this.buildSearchQuery(params);
      const url = `${this.baseUrl}/api/job_positions?${query}`;
      const data = await this.rateLimitedFetch(url);
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      const jobs = (result.jobPositions || result.data || []).map((job) => this.normalizeJob(job));

      return {
        success: true,
        source: this.source,
        total: result.totalCount || result.total || jobs.length,
        hasMore: jobs.length >= (params.limit || 20),
        nextOffset: (params.offset || 0) + jobs.length,
        jobs,
      };
    } catch (error) {
      return { success: false, source: this.source, error: error.message, jobs: [] };
    }
  }

  /**
   * Normalize a Programmers job object to common format.
   * @param {Object} job - Raw Programmers job data
   * @returns {Object} Normalized job
   */
  normalizeJob(job) {
    return {
      id: `programmers-${job.id || job.jobPositionId}`,
      source: this.source,
      title: job.title || job.jobPosition || '',
      company: job.companyName || job.company?.name || '',
      location: job.address || job.location || '서울',
      url: `${this.baseUrl}/job_positions/${job.id || job.jobPositionId}`,
      description: job.description || job.requirement || '',
      skills: job.technicalTags || job.techStacks || [],
      salary: job.salary || job.annualFrom ? `${job.annualFrom}~${job.annualTo}만원` : null,
      postedAt: job.createdAt || job.publishedAt || null,
      deadline: job.closedAt || job.deadline || null,
    };
  }

  /**
   * Get detailed job information.
   * @param {string} jobId - Job identifier
   * @returns {Promise<Object>} Job detail
   */
  async getJobDetail(jobId) {
    try {
      const numericId = jobId.replace('programmers-', '');
      const url = `${this.baseUrl}/api/job_positions/${numericId}`;
      const data = await this.rateLimitedFetch(url);
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: true, job: this.normalizeJob(result.data || result) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default ProgrammersCrawler;

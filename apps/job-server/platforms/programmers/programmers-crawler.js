import { BaseCrawler } from '../../src/crawlers/base-crawler.js';

/**
 * @typedef {{ keyword?: string, offset?: number, limit?: number, category?: string }} ProgrammersSearchParams
 * @typedef {{
 *   id?: string | number, jobPositionId?: string | number,
 *   title?: string, jobPosition?: string, companyName?: string,
 *   company?: { name?: string }, address?: string, location?: string,
 *   description?: string, requirement?: string, technicalTags?: string[], techStacks?: string[],
 *   salary?: string | number, annualFrom?: number, annualTo?: number,
 *   createdAt?: string | null, publishedAt?: string | null,
 *   closedAt?: string | null, deadline?: string | null
 * }} RawProgrammersJob
 * @typedef {{ jobPositions?: RawProgrammersJob[], data?: RawProgrammersJob[], totalCount?: number, total?: number }} ProgrammersSearchResponse
 * @typedef {RawProgrammersJob & { data?: RawProgrammersJob }} ProgrammersDetailResponse
 */

/**
 * Programmers (programmers.co.kr) job platform crawler.
 * Kakao-backed Korean developer job platform.
 * @extends BaseCrawler
 */
export class ProgrammersCrawler extends BaseCrawler {
  /**
   * @param {import('../../src/crawlers/base-crawler.js').BaseCrawlerOptions} [options] - Crawler options
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
   * @param {ProgrammersSearchParams} params - Search parameters
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
      searchParams.set('page', String(Math.floor(params.offset / (params.limit || 20)) + 1));
    if (params.limit) searchParams.set('size', String(params.limit));
    if (params.category) searchParams.set('category', params.category);
    searchParams.set('order', 'recent');
    return searchParams.toString();
  }

  /**
   * Search for jobs on Programmers.
   * @param {ProgrammersSearchParams} params - Search parameters
   * @returns {Promise<{success: true, source: string, total: number, hasMore: boolean, nextOffset: number, jobs: ReturnType<ProgrammersCrawler['normalizeJob']>[]} | {success: false, source: string, error: string, jobs: []}>}
   */
  async searchJobs(params = {}) {
    try {
      const query = this.buildSearchQuery(params);
      const url = `${this.baseUrl}/api/job_positions?${query}`;
      const result = /** @type {ProgrammersSearchResponse} */ (await this.fetchJSON(url));
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
      return {
        success: false,
        source: this.source,
        error: error instanceof Error ? error.message : String(error),
        jobs: [],
      };
    }
  }

  /**
   * Normalize a Programmers job object to common format.
   * @param {RawProgrammersJob} job - Raw Programmers job data
   * @returns Normalized job
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
   * @returns {Promise<{success: true, job: ReturnType<ProgrammersCrawler['normalizeJob']>} | {success: false, error: string}>} Job detail
   */
  async getJobDetail(jobId) {
    try {
      const numericId = jobId.replace('programmers-', '');
      const url = `${this.baseUrl}/api/job_positions/${numericId}`;
      const result = /** @type {ProgrammersDetailResponse} */ (await this.fetchJSON(url));
      return { success: true, job: this.normalizeJob(result.data || result) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

export default ProgrammersCrawler;

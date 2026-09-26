import { BaseCrawler } from '../../src/crawlers/base-crawler.js';

/**
 * @typedef {{ keyword?: string, offset?: number, limit?: number, techStack?: string }} JumpitSearchParams
 * @typedef {{
 *   id?: string | number, positionId?: string | number,
 *   title?: string, positionName?: string, companyName?: string,
 *   company?: { name?: string }, location?: string, workPlace?: string,
 *   description?: string, content?: string, techStacks?: string[], skills?: string[],
 *   minSalary?: number, maxSalary?: number, minCareer?: number, maxCareer?: number,
 *   createdAt?: string | null, publishedAt?: string | null,
 *   closedAt?: string | null, deadline?: string | null
 * }} RawJumpitJob
 * @typedef {{ result?: { positions?: RawJumpitJob[], totalCount?: number }, data?: RawJumpitJob[] }} JumpitSearchResponse
 * @typedef {RawJumpitJob & { result?: RawJumpitJob, data?: RawJumpitJob }} JumpitDetailResponse
 */

/**
 * Jumpit (jumpit.co.kr) job platform crawler.
 * Korean developer-focused job platform.
 * @extends BaseCrawler
 */
export class JumpitCrawler extends BaseCrawler {
  /**
   * @param {import('../../src/crawlers/base-crawler.js').BaseCrawlerOptions} [options] - Crawler options
   */
  constructor(options = {}) {
    super('jumpit', {
      baseUrl: 'https://www.jumpit.co.kr',
      rateLimit: 1000,
      ...options,
    });
    this.source = 'jumpit';
    this.apiBase = 'https://api.jumpit.co.kr';
  }

  /**
   * Build search query URL from parameters.
   * @param {JumpitSearchParams} [params] - Search parameters
   * @returns {string} Query URL
   */
  buildSearchQuery(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.set('search', params.keyword);
    searchParams.set('page', String(Math.floor((params.offset || 0) / (params.limit || 16)) + 1));
    searchParams.set('sort', 'rpiDesc');
    if (params.techStack) searchParams.set('techStack', params.techStack);
    return searchParams.toString();
  }

  /**
   * Search for jobs on Jumpit.
   * @param {JumpitSearchParams} params - Search parameters
   * @returns {Promise<{success: true, source: string, total: number, hasMore: boolean, nextOffset: number, jobs: ReturnType<JumpitCrawler['normalizeJob']>[]} | {success: false, source: string, error: string, jobs: []}>}
   */
  async searchJobs(params = {}) {
    try {
      const query = this.buildSearchQuery(params);
      const url = `${this.apiBase}/api/positions?${query}`;
      const result = /** @type {JumpitSearchResponse} */ (await this.fetchJSON(url));
      const positions = result.result?.positions || result.data || [];
      const jobs = positions.map((job) => this.normalizeJob(job));

      return {
        success: true,
        source: this.source,
        total: result.result?.totalCount || jobs.length,
        hasMore: jobs.length >= (params.limit || 16),
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
   * Normalize a Jumpit job object to common format.
   * @param {RawJumpitJob} job - Raw Jumpit job data
   * @returns Normalized job
   */
  normalizeJob(job) {
    return {
      id: `jumpit-${job.id || job.positionId}`,
      source: this.source,
      title: job.title || job.positionName || '',
      company: job.companyName || job.company?.name || '',
      location: job.location || job.workPlace || '서울',
      url: `${this.baseUrl}/position/${job.id || job.positionId}`,
      description: job.description || job.content || '',
      skills: job.techStacks || job.skills || [],
      salary: job.minSalary ? `${job.minSalary}~${job.maxSalary}만원` : null,
      postedAt: job.createdAt || job.publishedAt || null,
      deadline: job.closedAt || job.deadline || null,
      experience: job.minCareer != null ? `${job.minCareer}~${job.maxCareer}년` : null,
    };
  }

  /**
   * Get detailed job information.
   * @param {string} jobId - Job identifier
   * @returns {Promise<{success: true, job: ReturnType<JumpitCrawler['normalizeJob']>} | {success: false, error: string}>} Job detail
   */
  async getJobDetail(jobId) {
    try {
      const numericId = jobId.replace('jumpit-', '');
      const url = `${this.apiBase}/api/positions/${numericId}`;
      const result = /** @type {JumpitDetailResponse} */ (await this.fetchJSON(url));
      return { success: true, job: this.normalizeJob(result.result || result.data || result) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

export default JumpitCrawler;

import { BaseCrawler } from '../../src/crawlers/base-crawler.js';

/**
 * Jumpit (jumpit.co.kr) job platform crawler.
 * Korean developer-focused job platform.
 * @extends BaseCrawler
 */
export class JumpitCrawler extends BaseCrawler {
  /**
   * @param {Object} [options] - Crawler options
   * @param {number} [options.rateLimit=1000] - Rate limit in ms between requests
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
   * @param {Object} params - Search parameters
   * @param {string} [params.keyword] - Search keyword
   * @param {number} [params.offset=0] - Pagination offset
   * @param {number} [params.limit=16] - Results per page
   * @param {string} [params.techStack] - Tech stack filter
   * @returns {string} Query URL
   */
  buildSearchQuery(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.set('search', params.keyword);
    searchParams.set('page', Math.floor((params.offset || 0) / (params.limit || 16)) + 1);
    searchParams.set('sort', 'rpiDesc');
    if (params.techStack) searchParams.set('techStack', params.techStack);
    return searchParams.toString();
  }

  /**
   * Search for jobs on Jumpit.
   * @param {Object} params - Search parameters
   * @returns {Promise<{success: boolean, source: string, total: number, hasMore: boolean, jobs: Array}>}
   */
  async searchJobs(params = {}) {
    try {
      const query = this.buildSearchQuery(params);
      const url = `${this.apiBase}/api/positions?${query}`;
      const data = await this.rateLimitedFetch(url);
      const result = typeof data === 'string' ? JSON.parse(data) : data;
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
      return { success: false, source: this.source, error: error.message, jobs: [] };
    }
  }

  /**
   * Normalize a Jumpit job object to common format.
   * @param {Object} job - Raw Jumpit job data
   * @returns {Object} Normalized job
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
   * @returns {Promise<Object>} Job detail
   */
  async getJobDetail(jobId) {
    try {
      const numericId = jobId.replace('jumpit-', '');
      const url = `${this.apiBase}/api/positions/${numericId}`;
      const data = await this.rateLimitedFetch(url);
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: true, job: this.normalizeJob(result.result || result.data || result) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default JumpitCrawler;

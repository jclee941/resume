/**
 * Remember Crawler - 리멤버 커리어 채용공고 크롤러
 *
 * API Endpoints (no auth required):
 * - career-api.rememberapp.co.kr/job_postings/search
 * - career-api.rememberapp.co.kr/job_postings/curations
 *
 * Fallback: rebrowser-puppeteer for DOM scraping (stealth CDP patches)
 */

import { BaseCrawler } from '../../src/crawlers/base-crawler.js';
import { normalizeRememberJob } from './remember-job-normalizer.js';
import {
  getRememberJobDetailWithBrowser,
  searchRememberWithBrowser,
} from './remember-browser-scraper.js';

/**
 * @typedef {import('../../src/crawlers/base-crawler.js').BaseCrawlerOptions & {
 *   apiBaseUrl?: string;
 * }} RememberCrawlerOptions
 */

/**
 * @typedef {Object} RememberSearchParams
 * @property {string} [keyword]
 * @property {string | number} [page]
 * @property {number} [limit]
 */

export class RememberCrawler extends BaseCrawler {
  /**
   * @param {RememberCrawlerOptions} [options]
   */
  constructor(options = {}) {
    super(
      'remember',
      /** @type {import('../../src/crawlers/base-crawler.js').BaseCrawlerOptions} */ ({
        baseUrl: 'https://career.rememberapp.co.kr',
        apiBaseUrl: 'https://career-api.rememberapp.co.kr',
        rateLimit: 1000,
        ...options,
      })
    );
    /** @type {string} */
    this.apiBaseUrl = options.apiBaseUrl || 'https://career-api.rememberapp.co.kr';
  }

  /**
   * @param {RememberSearchParams} params
   */
  buildSearchQuery(params) {
    const query = new URLSearchParams();
    if (params.keyword) query.set('search', params.keyword);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('per', String(Math.min(params.limit, 50)));
    return query.toString();
  }

  /**
   * @param {RememberSearchParams} [params]
   */
  async searchJobs(params = {}) {
    try {
      const apiResult = await this.searchWithAPI(params);
      if (apiResult.success && apiResult.jobs.length > 0) {
        return apiResult;
      }
      return await this.searchWithBrowser(params);
    } catch (error) {
      console.error(
        '[Remember] Search error:',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        source: 'remember',
        error: error instanceof Error ? error.message : String(error),
        jobs: [],
      };
    }
  }

  /**
   * @param {RememberSearchParams} [params]
   */
  async searchWithAPI(params = {}) {
    try {
      const searchParams = {
        page: params.page || 1,
        per: Math.min(params.limit || 20, 50),
      };

      const body = new URLSearchParams();
      body.set('page', String(searchParams.page));
      body.set('per', String(searchParams.per));
      if (params.keyword) body.set('search', params.keyword);

      const url = params.keyword
        ? `${this.apiBaseUrl}/job_postings/search`
        : `${this.apiBaseUrl}/job_postings/curations?tab=STEP_UP&page=${searchParams.page}&per=${searchParams.per}`;

      const response = await fetch(url, {
        method: params.keyword ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': this.headers['User-Agent'],
          Origin: this.baseUrl,
          Referer: `${this.baseUrl}/job/postings`,
        },
        ...(params.keyword ? { body: body.toString() } : {}),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const jobsData = data.data?.job_postings || data.data || [];
      const jobs = Array.isArray(jobsData) ? jobsData : [];

      return {
        success: true,
        source: 'remember',
        total: jobs.length,
        hasMore: jobs.length >= searchParams.per,
        jobs: jobs.map((job) => this.normalizeJob(job)),
      };
    } catch (error) {
      console.warn(
        '[Remember] API search failed:',
        error instanceof Error ? error.message : String(error)
      );
      return { success: false, jobs: [] };
    }
  }

  /**
   * @param {RememberSearchParams} [params]
   */
  async searchWithBrowser(params = {}) {
    return searchRememberWithBrowser(
      this.baseUrl,
      (job, isDetail) => this.normalizeJob(job, isDetail),
      params
    );
  }

  /**
   * @param {string | number} jobId
   */
  async getJobDetail(jobId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/job_postings/${jobId}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': this.headers['User-Agent'],
        },
      });

      if (response.ok) {
        const data = await response.json();
        const job = data.data || data;
        return {
          success: true,
          source: 'remember',
          job: this.normalizeJob(job, true),
        };
      }

      return await this.getJobDetailWithBrowser(jobId);
    } catch (error) {
      return {
        success: false,
        source: 'remember',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * @param {string | number} jobId
   */
  async getJobDetailWithBrowser(jobId) {
    return getRememberJobDetailWithBrowser(
      this.baseUrl,
      (job, isDetail) => this.normalizeJob(job, isDetail),
      jobId
    );
  }

  /**
   * @param {import('./remember-job-normalizer.js').RawRememberJob | import('./remember-browser-scraper.js').RawRememberScrapedJob | import('./remember-browser-scraper.js').RawRememberScrapedDetail} rawJob
   * @param {boolean} [isDetail]
   */
  normalizeJob(rawJob, isDetail = false) {
    return normalizeRememberJob(rawJob, this.baseUrl, isDetail);
  }

  async getProfile() {
    if (!this.cookies) {
      return {
        success: false,
        error: 'Authentication required. Login to career.rememberapp.co.kr and provide cookies.',
      };
    }
    return { success: true, profile: { name: null, careers: [], skills: [] } };
  }
}

export const REMEMBER_CATEGORIES = {
  STEP_UP: 'STEP_UP', // 커리어 도약
  SILVER_SALARY: 'SILVER_TIER_SALARY', // 5천 이상 연봉
  GOLD_SALARY: 'GOLD_TIER_SALARY', // 억대 연봉
  LEADER: 'LEADER_POSITION', // 리더급 포지션
};

export default RememberCrawler;

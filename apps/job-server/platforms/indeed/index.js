/**
 * Indeed Korea Crawler - 인디드 채용공고 크롤러.
 *
 * Scrapes Indeed Korea (kr.indeed.com) job listings via HTML parsing.
 * Anti-detection behavior is inherited from BaseCrawler.
 */

import { BaseCrawler } from '../../src/crawlers/base-crawler.js';
import {
  normalizeJob,
  normalizeJsonLd,
  parseJobDetail,
  parseSearchResults,
} from './job-extractor.js';
import { buildSearchQuery, searchByKeyword, searchJobs } from './search.js';

export { INDEED_DATE_POSTED, INDEED_JOB_TYPES } from './search.js';
export {
  normalizeJob,
  normalizeJsonLd,
  parseJobDetail,
  parseSearchResults,
} from './job-extractor.js';
export { applyPaginationParams, buildPaginationResult } from './pagination.js';

export class IndeedCrawler extends BaseCrawler {
  /**
   * @param {import('../../src/crawlers/base-crawler.js').BaseCrawlerOptions} [options]
   */
  constructor(options = {}) {
    super('indeed', {
      baseUrl: 'https://kr.indeed.com',
      rateLimit: 2000,
      ...options,
    });

    this.apiBase = 'https://kr.indeed.com';
  }

  /**
   * @param {import('./search.js').IndeedSearchParams} params
   */
  buildSearchQuery(params) {
    return buildSearchQuery(params);
  }

  /**
   * @param {import('./search.js').IndeedSearchParams} [params]
   */
  async searchJobs(params = {}) {
    return searchJobs(this, params);
  }

  /**
   * @param {string} keyword
   * @param {import('./search.js').IndeedSearchParams} [options]
   */
  async searchByKeyword(keyword, options = {}) {
    return searchByKeyword(this, keyword, options);
  }

  /**
   * @param {string} jobKey
   */
  async getJobDetail(jobKey) {
    const url = `${this.apiBase}/viewjob?jk=${encodeURIComponent(jobKey)}`;

    try {
      const html = await this.fetchHTML(url);
      const job = this._parseJobDetail(html, jobKey);

      return {
        success: true,
        source: 'indeed',
        job,
      };
    } catch (error) {
      return {
        success: false,
        source: 'indeed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * @param {import('./job-extractor.js').RawIndeedJob} rawJob
   */
  normalizeJob(rawJob) {
    return normalizeJob(rawJob);
  }

  async checkAuth() {
    return { authenticated: true, reason: 'Indeed search does not require authentication' };
  }

  /**
   * @param {string} jobKey
   */
  async applyToJob(jobKey) {
    return {
      success: false,
      error: 'Indeed applications require redirect to employer site',
      redirectUrl: `https://kr.indeed.com/viewjob?jk=${encodeURIComponent(jobKey)}`,
    };
  }

  /**
   * @param {string} html
   */
  _parseSearchResults(html) {
    return parseSearchResults(html, this.normalizeJob.bind(this), this._normalizeJsonLd.bind(this));
  }

  /**
   * @param {string} html
   * @param {string} jobKey
   */
  _parseJobDetail(html, jobKey) {
    return parseJobDetail(
      html,
      jobKey,
      this.normalizeJob.bind(this),
      this._normalizeJsonLd.bind(this)
    );
  }

  /**
   * @param {import('./job-extractor.js').JsonLdJob} jsonLd
   */
  _normalizeJsonLd(jsonLd) {
    return normalizeJsonLd(jsonLd);
  }
}

export default IndeedCrawler;

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
  constructor(options = {}) {
    super('indeed', {
      baseUrl: 'https://kr.indeed.com',
      rateLimit: 2000,
      ...options,
    });

    this.apiBase = 'https://kr.indeed.com';
  }

  buildSearchQuery(params) {
    return buildSearchQuery(params);
  }

  async searchJobs(params = {}) {
    return searchJobs(this, params);
  }

  async searchByKeyword(keyword, options = {}) {
    return searchByKeyword(this, keyword, options);
  }

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
        error: error.message,
      };
    }
  }

  normalizeJob(rawJob) {
    return normalizeJob(rawJob);
  }

  async checkAuth() {
    return { authenticated: true, reason: 'Indeed search does not require authentication' };
  }

  async applyToJob(jobKey) {
    return {
      success: false,
      error: 'Indeed applications require redirect to employer site',
      redirectUrl: `https://kr.indeed.com/viewjob?jk=${encodeURIComponent(jobKey)}`,
    };
  }

  _parseSearchResults(html) {
    return parseSearchResults(html, this.normalizeJob.bind(this), this._normalizeJsonLd.bind(this));
  }

  _parseJobDetail(html, jobKey) {
    return parseJobDetail(
      html,
      jobKey,
      this.normalizeJob.bind(this),
      this._normalizeJsonLd.bind(this)
    );
  }

  _normalizeJsonLd(jsonLd) {
    return normalizeJsonLd(jsonLd);
  }
}

export default IndeedCrawler;

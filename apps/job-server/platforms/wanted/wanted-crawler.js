/**
 * Wanted Korea Crawler - 원티드 채용공고 크롤러
 */

import { BaseCrawler } from '../../src/crawlers/base-crawler.js';
import {
  WANTED_CATEGORIES,
  buildWantedKeywordQuery,
  buildWantedSearchQuery,
  normalizeWantedJob,
} from './wanted-job-normalizer.js';
import { applyWantedJob, checkWantedAuth, getWantedCompanyInfo } from './wanted-crawler-actions.js';

export { WANTED_CATEGORIES };

export class WantedCrawler extends BaseCrawler {
  constructor(options = {}) {
    super('wanted', {
      baseUrl: 'https://www.wanted.co.kr',
      rateLimit: 500,
      ...options,
    });

    this.apiBase = 'https://www.wanted.co.kr/api/v4';
  }

  /**
   * 검색 쿼리 빌드
   */
  buildSearchQuery(params) {
    return buildWantedSearchQuery(params);
  }

  /**
   * 채용공고 검색
   */
  async searchJobs(params = {}) {
    const query = this.buildSearchQuery(params);
    const url = `${this.apiBase}/jobs?${query}`;

    try {
      const data = await this.fetchJSON(url);

      const jobs = (data.data || []).map((job) => this.normalizeJob(job));

      return {
        success: true,
        source: 'wanted',
        total: jobs.length,
        hasMore: !!data.links?.next,
        nextOffset: (params.offset || 0) + jobs.length,
        jobs,
      };
    } catch (error) {
      return {
        success: false,
        source: 'wanted',
        error: error.message,
        jobs: [],
      };
    }
  }

  /**
   * 키워드 검색
   */
  async searchByKeyword(keyword, options = {}) {
    const query = buildWantedKeywordQuery(keyword, options);
    const url = `${this.apiBase}/jobs?${query}`;

    try {
      const data = await this.fetchJSON(url);
      const jobs = (data.data || []).map((job) => this.normalizeJob(job));

      return {
        success: true,
        source: 'wanted',
        keyword,
        total: jobs.length,
        hasMore: !!data.links?.next,
        jobs,
      };
    } catch (error) {
      return {
        success: false,
        source: 'wanted',
        error: error.message,
        jobs: [],
      };
    }
  }

  /**
   * 채용공고 상세 조회
   */
  async getJobDetail(jobId) {
    const url = `${this.apiBase}/jobs/${jobId}`;

    try {
      const data = await this.fetchJSON(url);
      const job = data.job || data;

      return {
        success: true,
        source: 'wanted',
        job: {
          ...this.normalizeJob(job),
          description: job.detail?.main_tasks || '',
          requirements: job.detail?.requirements || '',
          benefits: job.detail?.benefits || '',
          preferredPoints: job.detail?.preferred_points || '',
          intro: job.detail?.intro || '',
        },
      };
    } catch (error) {
      return {
        success: false,
        source: 'wanted',
        error: error.message,
      };
    }
  }

  /**
   * 회사 정보 조회
   */
  async getCompanyInfo(companyId) {
    return getWantedCompanyInfo(this, companyId);
  }

  /**
   * 결과 정규화
   */
  normalizeJob(rawJob) {
    return normalizeWantedJob(rawJob);
  }

  /**
   * 인증 상태 확인
   */
  async checkAuth() {
    return checkWantedAuth(this);
  }

  /**
   * 지원하기 (인증 필요)
   */
  async applyToJob(jobId, applicationData = {}) {
    return applyWantedJob(this, jobId, applicationData);
  }
}

export default WantedCrawler;

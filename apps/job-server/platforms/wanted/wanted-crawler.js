/**
 * Wanted Korea Crawler - 원티드 채용공고 크롤러
 */

import { BaseCrawler } from '../../src/crawlers/base-crawler.js';

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
    const query = new URLSearchParams({
      country: 'kr',
      job_sort: params.sort || 'job.latest_order',
      years: params.years ?? -1,
      locations: params.locations || 'all',
      limit: Math.min(params.limit || 20, 100),
      offset: params.offset || 0,
    });

    // 직무 카테고리
    if (params.tag_type_ids && params.tag_type_ids.length > 0) {
      params.tag_type_ids.forEach((id) => query.append('tag_type_ids', id));
    }

    return query.toString();
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
    const query = new URLSearchParams({
      query: keyword,
      country: 'kr',
      job_sort: options.sort || 'job.latest_order',
      years: options.years ?? -1,
      limit: Math.min(options.limit || 20, 100),
      offset: options.offset || 0,
    });

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
          description: job.detail?.requirements || '',
          requirements: job.detail?.main_tasks || '',
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
    const url = `${this.apiBase}/companies/${companyId}`;

    try {
      const data = await this.fetchJSON(url);

      return {
        success: true,
        source: 'wanted',
        company: {
          id: data.id,
          name: data.name,
          industry: data.industry_name,
          employeeCount: data.employee_count,
          description: data.description,
          address: data.address,
          website: data.website,
          logoUrl: data.logo_img?.origin,
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
   * 결과 정규화
   */
  normalizeJob(rawJob) {
    return {
      id: `wanted_${rawJob.id}`,
      sourceId: rawJob.id,
      source: 'wanted',
      sourceUrl: `https://www.wanted.co.kr/wd/${rawJob.id}`,
      position: rawJob.position || '',
      company: rawJob.company?.name || '',
      companyId: rawJob.company?.id || '',
      location: [rawJob.address?.location, rawJob.address?.district]
        .filter(Boolean)
        .join(' '),
      experienceMin: rawJob.annual_from || 0,
      experienceMax: rawJob.annual_to || 99,
      salary: rawJob.reward?.formatted_total || '',
      techStack: rawJob.skill_tags?.map((t) => t.title) || [],
      description: '',
      requirements: '',
      benefits: '',
      dueDate: rawJob.due_time || null,
      postedDate: rawJob.created_at || null,
      isRemote: rawJob.is_remote || false,
      employmentType: rawJob.employment_type || '정규직',
      industry: rawJob.company?.industry_name || '',
      crawledAt: new Date().toISOString(),
    };
  }

  /**
   * 인증 상태 확인
   */
  async checkAuth() {
    if (!this.cookies) {
      return { authenticated: false, reason: 'No cookies set' };
    }

    try {
      const url = 'https://www.wanted.co.kr/api/chaos/me';
      const response = await this.rateLimitedFetch(url);
      const data = await response.json();

      return {
        authenticated: !!data.user,
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
            }
          : null,
      };
    } catch (error) {
      return { authenticated: false, error: error.message };
    }
  }

  /**
   * 지원하기 (인증 필요)
   */
  async applyToJob(jobId, applicationData = {}) {
    if (!this.cookies) {
      return { success: false, error: 'Authentication required' };
    }

    const url = 'https://www.wanted.co.kr/api/chaos/applications/v2';

    try {
      const response = await this.rateLimitedFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          resume_id: applicationData.resumeId,
          cover_letter: applicationData.coverLetter || '',
          ...applicationData,
        }),
      });

      const data = await response.json();

      return {
        success: true,
        source: 'wanted',
        applicationId: data.id,
        status: data.status,
        appliedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        source: 'wanted',
        error: error.message,
      };
    }
  }
}

// 직무 카테고리 상수
export const WANTED_CATEGORIES = {
  DEVOPS: 674,
  SYSTEM_ADMIN: 665,
  SECURITY: 672,
  BACKEND: 872,
  FRONTEND: 669,
  PYTHON: 899,
  ML_ENGINEER: 1634,
  DATA_ENGINEER: 655,
  PRODUCT_MANAGER: 876,
  INFRA: 895,
  DBA: 656,
  QA: 676,
  CTO: 877,
};

export default WantedCrawler;

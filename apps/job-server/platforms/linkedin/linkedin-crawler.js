/**
 * LinkedIn Crawler - 링크드인 채용공고 크롤러
 * Note: LinkedIn은 API 제한이 엄격하므로 공개 검색만 지원
 */

import { BaseCrawler } from '../../src/crawlers/base-crawler.js';

export class LinkedInCrawler extends BaseCrawler {
  constructor(options = {}) {
    super('linkedin', {
      baseUrl: 'https://www.linkedin.com',
      rateLimit: 2000, // LinkedIn은 rate limit이 매우 엄격
      ...options,
    });
  }

  /**
   * 검색 쿼리 빌드
   */
  buildSearchQuery(params) {
    const query = new URLSearchParams({
      keywords: params.keyword || '',
      location: params.location || 'South Korea',
      f_TPR: params.timeRange || 'r604800', // 최근 1주일
      position: params.offset || 0,
      pageNum: params.page || 0,
    });

    // 경력 레벨
    if (params.experienceLevel) {
      query.set('f_E', this.getExperienceLevel(params.experienceLevel));
    }

    // 근무 형태
    if (params.workType) {
      query.set('f_WT', params.workType); // 1: On-site, 2: Remote, 3: Hybrid
    }

    return query.toString();
  }

  /**
   * 경력 레벨 변환
   */
  getExperienceLevel(years) {
    if (years <= 2) return '1,2'; // Internship, Entry level
    if (years <= 5) return '3'; // Associate
    if (years <= 10) return '4'; // Mid-Senior level
    return '5,6'; // Director, Executive
  }

  /**
   * 채용공고 검색 (공개 API)
   */
  async searchJobs(params = {}) {
    const query = this.buildSearchQuery(params);
    const url = `${this.baseUrl}/jobs-guest/jobs/api/seeMoreJobPostings/search?${query}`;

    try {
      const html = await this.fetchHTML(url);
      const jobs = this.parseSearchResults(html);

      return {
        success: true,
        source: 'linkedin',
        total: jobs.length,
        hasMore: jobs.length >= 25,
        jobs,
      };
    } catch (error) {
      return {
        success: false,
        source: 'linkedin',
        error: error.message,
        jobs: [],
      };
    }
  }

  /**
   * 검색 결과 HTML 파싱
   */
  parseSearchResults(html) {
    const jobs = [];

    // LinkedIn 채용공고 카드 패턴
    const jobPattern =
      /<div[^>]*class="[^"]*base-card[^"]*"[^>]*data-entity-urn="urn:li:jobPosting:(\d+)"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([^<]+)<\/h3>[\s\S]*?<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;

    let match;
    while ((match = jobPattern.exec(html)) !== null) {
      jobs.push(
        this.normalizeJob({
          id: match[1],
          position: match[2].trim(),
          company: match[3].trim(),
        }),
      );
    }

    // 대체 패턴 (리스트 아이템)
    const altPattern =
      /<li[^>]*>[\s\S]*?<a[^>]*href="[^"]*\/jobs\/view\/(\d+)[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*class="[^"]*job-search-card__company-name[^"]*"[^>]*>([^<]+)<\/span>/gi;

    while ((match = altPattern.exec(html)) !== null) {
      const exists = jobs.some((j) => j.sourceId === match[1]);
      if (!exists) {
        jobs.push(
          this.normalizeJob({
            id: match[1],
            position: match[2].trim(),
            company: match[3].trim(),
          }),
        );
      }
    }

    return jobs;
  }

  /**
   * 채용공고 상세 조회
   */
  async getJobDetail(jobId) {
    const url = `${this.baseUrl}/jobs-guest/jobs/api/jobPosting/${jobId}`;

    try {
      const html = await this.fetchHTML(url);
      const job = this.parseJobDetail(html, jobId);

      return {
        success: true,
        source: 'linkedin',
        job,
      };
    } catch (error) {
      return {
        success: false,
        source: 'linkedin',
        error: error.message,
      };
    }
  }

  /**
   * 상세 페이지 파싱
   */
  parseJobDetail(html, jobId) {
    const titleMatch = html.match(
      /<h1[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    );
    const companyMatch = html.match(
      /<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*>([^<]+)<\/a>/i,
    );
    const locationMatch = html.match(
      /<span[^>]*class="[^"]*topcard__flavor--bullet[^"]*"[^>]*>([^<]+)<\/span>/i,
    );
    const descMatch = html.match(
      /<div[^>]*class="[^"]*description__text[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    );

    return {
      id: `linkedin_${jobId}`,
      sourceId: jobId,
      source: 'linkedin',
      sourceUrl: `${this.baseUrl}/jobs/view/${jobId}`,
      position: titleMatch ? titleMatch[1].trim() : '',
      company: companyMatch ? companyMatch[1].trim() : '',
      location: locationMatch ? locationMatch[1].trim() : '',
      description: descMatch ? this.stripHtml(descMatch[1]) : '',
      crawledAt: new Date().toISOString(),
    };
  }

  async getProfile() {
    return {
      success: false,
      error:
        'LinkedIn profile fetching is not supported due to strict API limits.',
    };
  }

  /**
   * HTML 태그 제거
   */
  stripHtml(html) {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 결과 정규화
   */
  normalizeJob(rawJob) {
    return {
      id: `linkedin_${rawJob.id}`,
      sourceId: rawJob.id,
      source: 'linkedin',
      sourceUrl: `${this.baseUrl}/jobs/view/${rawJob.id}`,
      position: rawJob.position || '',
      company: rawJob.company || '',
      companyId: rawJob.companyId || '',
      location: rawJob.location || 'South Korea',
      experienceMin: rawJob.experienceMin || 0,
      experienceMax: rawJob.experienceMax || 99,
      salary: rawJob.salary || '',
      techStack: rawJob.techStack || [],
      description: rawJob.description || '',
      requirements: rawJob.requirements || '',
      benefits: rawJob.benefits || '',
      dueDate: rawJob.dueDate || null,
      postedDate: rawJob.postedDate || null,
      isRemote: rawJob.isRemote || false,
      employmentType: rawJob.employmentType || '',
      crawledAt: new Date().toISOString(),
    };
  }

  /**
   * 회사별 채용공고 검색
   */
  async searchByCompany(companyName, options = {}) {
    return this.searchJobs({
      keyword: companyName,
      ...options,
    });
  }
}

// LinkedIn 검색 필터
export const LINKEDIN_FILTERS = {
  TIME_RANGE: {
    PAST_24H: 'r86400',
    PAST_WEEK: 'r604800',
    PAST_MONTH: 'r2592000',
  },
  WORK_TYPE: {
    ON_SITE: '1',
    REMOTE: '2',
    HYBRID: '3',
  },
  EXPERIENCE: {
    INTERNSHIP: '1',
    ENTRY: '2',
    ASSOCIATE: '3',
    MID_SENIOR: '4',
    DIRECTOR: '5',
    EXECUTIVE: '6',
  },
};

export default LinkedInCrawler;

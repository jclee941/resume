/**
 * Unified Job Crawler - 통합 채용공고 크롤러
 * 모든 채용 사이트를 통합하여 검색
 */

import { WantedCrawler, WANTED_CATEGORIES } from '../../platforms/wanted/wanted-crawler.js';
import { JobKoreaCrawler, JOBKOREA_CATEGORIES } from '../../platforms/jobkorea/jobkorea-crawler.js';
import { SaraminCrawler, SARAMIN_CATEGORIES } from '../../platforms/saramin/saramin-crawler.js';
import { LinkedInCrawler, LINKEDIN_FILTERS } from '../../platforms/linkedin/linkedin-crawler.js';
import { RememberCrawler } from '../../platforms/remember/remember-crawler.js';
import { RocketPunchCrawler } from '../../platforms/rocketpunch/rocketpunch-crawler.js';
import { ProgrammersCrawler } from '../../platforms/programmers/programmers-crawler.js';
import { JumpitCrawler } from '../../platforms/jumpit/jumpit-crawler.js';
import { RallitCrawler } from '../../platforms/rallit/rallit-crawler.js';
import { filterAndRankJobs, prioritizeApplications } from '../shared/services/matching/index.js';
import { SessionManager } from '../shared/services/session/index.js';

export class UnifiedJobCrawler {
  constructor(options = {}) {
    this.crawlers = {
      wanted: new WantedCrawler(options.wanted),
      jobkorea: new JobKoreaCrawler(options.jobkorea),
      saramin: new SaraminCrawler(options.saramin),
      linkedin: new LinkedInCrawler(options.linkedin),
      remember: new RememberCrawler(options.remember),
      rocketpunch: new RocketPunchCrawler(options.rocketpunch),
      programmers: new ProgrammersCrawler(options.programmers),
      jumpit: new JumpitCrawler(options.jumpit),
      rallit: new RallitCrawler(options.rallit),
    };

    this.loadPlatformSessions();

    this.enabledSources = options.sources || [
      'wanted',
      'jobkorea',
      'saramin',
      'linkedin',
      'remember',
      'rocketpunch',
      'programmers',
      'jumpit',
      'rallit',
    ];
    this.resumePath = options.resumePath;
  }

  loadPlatformSessions() {
    const sessions = SessionManager.load();
    Object.keys(this.crawlers).forEach((platform) => {
      if (sessions[platform]?.cookies) {
        this.crawlers[platform].cookies = sessions[platform].cookies;
      }
    });
  }

  /**
   * 모든 소스에서 채용공고 검색
   */
  async searchAll(params = {}) {
    const {
      keyword,
      categories = [],
      experience,
      location,
      limit = 20,
      sources = this.enabledSources,
    } = params;

    const results = await Promise.allSettled(
      sources.map((source) =>
        this.searchSource(source, {
          keyword,
          categories,
          experience,
          location,
          limit,
        })
      )
    );

    // 결과 통합
    const allJobs = [];
    const sourceStats = {};

    results.forEach((result, index) => {
      const source = sources[index];
      if (result.status === 'fulfilled' && result.value.success) {
        allJobs.push(...result.value.jobs);
        sourceStats[source] = {
          success: true,
          count: result.value.jobs.length,
        };
      } else {
        sourceStats[source] = {
          success: false,
          error: result.reason?.message || result.value?.error || 'Unknown error',
        };
      }
    });

    // 중복 제거 (회사명 + 직무명 기준)
    const uniqueJobs = this.deduplicateJobs(allJobs);

    return {
      success: true,
      totalJobs: uniqueJobs.length,
      sourceStats,
      jobs: uniqueJobs,
    };
  }

  /**
   * 특정 소스에서 검색
   */
  async searchSource(source, params) {
    const crawler = this.crawlers[source];
    if (!crawler) {
      return { success: false, error: `Unknown source: ${source}`, jobs: [] };
    }

    // 소스별 파라미터 변환
    const sourceParams = this.convertParams(source, params);

    if (params.keyword) {
      // 키워드 검색
      if (source === 'wanted' && crawler.searchByKeyword) {
        return crawler.searchByKeyword(params.keyword, sourceParams);
      }
      return crawler.searchJobs({ ...sourceParams, keyword: params.keyword });
    }

    return crawler.searchJobs(sourceParams);
  }

  /**
   * 소스별 파라미터 변환
   */
  convertParams(source, params) {
    const converted = {
      limit: params.limit || 20,
      offset: params.offset || 0,
    };

    // 경력 변환
    if (params.experience !== undefined) {
      converted.years = params.experience;
      converted.experience = params.experience;
    }

    // 위치 변환
    if (params.location) {
      converted.locations = params.location;
      converted.location = params.location;
    }

    // 카테고리 변환 (원티드용)
    if (source === 'wanted' && params.categories?.length > 0) {
      converted.tag_type_ids = params.categories;
    }

    return converted;
  }

  /**
   * 중복 제거
   */
  deduplicateJobs(jobs) {
    const seen = new Map();

    return jobs.filter((job) => {
      const key = `${job.company?.toLowerCase()?.trim()}_${job.position?.toLowerCase()?.trim()}`;

      if (seen.has(key)) {
        const existing = seen.get(key);
        if (job.source === 'wanted' && existing.source !== 'wanted') {
          seen.set(key, job);
          return true;
        }
        return false;
      }

      seen.set(key, job);
      return true;
    });
  }

  async search(platform, keywords, options = {}) {
    const keywordStr = Array.isArray(keywords) ? keywords[0] : keywords;
    const result = await this.searchSource(platform, {
      keyword: keywordStr,
      limit: options.limit || 20,
      ...options,
    });
    return result.success ? result.jobs : [];
  }

  /**
   * 매칭 점수 기반 검색
   */
  async searchWithMatching(params = {}) {
    const searchResult = await this.searchAll(params);

    if (!searchResult.success || searchResult.jobs.length === 0) {
      return searchResult;
    }

    // 매칭 점수 계산
    const matchedResult = filterAndRankJobs(searchResult.jobs, {
      resumePath: this.resumePath,
      minScore: params.minScore !== undefined ? params.minScore : 50,
      maxResults: params.maxResults || 50,
      excludeCompanies: params.excludeCompanies || [],
    });

    // 지원 우선순위 결정
    const prioritizedJobs = prioritizeApplications(matchedResult.jobs);

    return {
      success: true,
      totalJobs: prioritizedJobs.length,
      sourceStats: searchResult.sourceStats,
      resumeAnalysis: matchedResult.resumeAnalysis,
      jobs: prioritizedJobs,
    };
  }

  /**
   * 추천 직무 검색 (보안/인프라 엔지니어용)
   */
  async searchRecommended(options = {}) {
    const defaultCategories = [
      WANTED_CATEGORIES.SECURITY,
      WANTED_CATEGORIES.DEVOPS,
      WANTED_CATEGORIES.INFRA,
      WANTED_CATEGORIES.SYSTEM_ADMIN,
    ];

    const defaultKeywords = [
      '시니어 엔지니어',
      '클라우드 엔지니어',
      'SRE',
      'DevOps',
      'Infrastructure',
    ];

    // 카테고리 기반 검색 (원티드)
    const categoryResults = await this.searchSource('wanted', {
      categories: options.categories || defaultCategories,
      experience: options.experience || 8,
      location: options.location || 'seoul',
      limit: 30,
    });

    // 키워드 기반 검색 (전체)
    const keywordResults = await Promise.all(
      (options.keywords || defaultKeywords).slice(0, 3).map((keyword) =>
        this.searchAll({
          keyword,
          experience: options.experience || 8,
          limit: 10,
          sources: options.sources || ['wanted', 'linkedin'],
        })
      )
    );

    // 결과 통합
    const allJobs = [
      ...(categoryResults.jobs || []),
      ...keywordResults.flatMap((r) => r.jobs || []),
    ];

    const uniqueJobs = this.deduplicateJobs(allJobs);

    // 매칭 및 우선순위
    const matchedResult = filterAndRankJobs(uniqueJobs, {
      resumePath: this.resumePath,
      minScore: options.minScore || 60,
      maxResults: options.maxResults || 30,
    });

    return {
      success: true,
      totalJobs: matchedResult.jobs.length,
      resumeAnalysis: matchedResult.resumeAnalysis,
      jobs: prioritizeApplications(matchedResult.jobs),
    };
  }

  /**
   * 특정 회사 채용공고 검색
   */
  async searchByCompany(companyName, options = {}) {
    return this.searchAll({
      keyword: companyName,
      ...options,
    });
  }

  /**
   * 채용공고 상세 조회
   */
  async getJobDetail(jobId) {
    // jobId 형식: source_id (예: wanted_12345)
    const [source, ...idParts] = jobId.split('_');
    const sourceId = idParts.join('_');

    const crawler = this.crawlers[source];
    if (!crawler) {
      return { success: false, error: `Unknown source: ${source}` };
    }

    return crawler.getJobDetail(sourceId);
  }

  /**
   * 크롤러 쿠키 설정
   */
  setCookies(source, cookies) {
    if (this.crawlers[source]) {
      this.crawlers[source].cookies = cookies;
    }
  }
}

// Export all
export {
  WantedCrawler,
  JobKoreaCrawler,
  SaraminCrawler,
  LinkedInCrawler,
  RememberCrawler,
  RocketPunchCrawler,
  ProgrammersCrawler,
  JumpitCrawler,
  RallitCrawler,
  WANTED_CATEGORIES,
  JOBKOREA_CATEGORIES,
  SARAMIN_CATEGORIES,
  LINKEDIN_FILTERS,
};

export default UnifiedJobCrawler;

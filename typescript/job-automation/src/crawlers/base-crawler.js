/**
 * Base Crawler - 채용 사이트 크롤러 기본 클래스
 */

import { EventEmitter } from 'events';

/**
 * Randomized modern Chrome User-Agent pool (Chrome 128-131).
 * Reduces fingerprinting risk vs a single hardcoded UA string.
 */
const CHROME_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.109 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.139 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.69 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.117 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.92 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.116 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.101 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.89 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.70 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.138 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.119 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.84 Safari/537.36',
];

/** @returns {string} Random Chrome UA from pool */
function getRandomUA() {
  return CHROME_USER_AGENTS[Math.floor(Math.random() * CHROME_USER_AGENTS.length)];
}

export class BaseCrawler extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.baseUrl = options.baseUrl || '';
    this.rateLimit = options.rateLimit || 1000; // ms between requests
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 30000;
    this.headers = {
      'User-Agent': options.userAgent || getRandomUA(),
      Accept: 'application/json, text/html, */*',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      ...options.headers,
    };
    this.cookies = options.cookies || '';
    this.lastRequestTime = 0;
  }

  /**
   * Rate limiting을 적용한 fetch
   */
  async rateLimitedFetch(url, options = {}) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimit) {
      await this.sleep(this.rateLimit - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();

    const fetchOptions = {
      method: options.method || 'GET',
      headers: {
        ...this.headers,
        ...options.headers,
        ...(this.cookies ? { Cookie: this.cookies } : {}),
      },
      signal: AbortSignal.timeout(this.timeout),
      ...options,
    };

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error;
        this.emit('retry', { url, attempt, error: error.message });

        if (attempt < this.maxRetries) {
          await this.sleep(this.rateLimit * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * JSON 응답 fetch
   */
  async fetchJSON(url, options = {}) {
    const response = await this.rateLimitedFetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    });
    return response.json();
  }

  /**
   * HTML 응답 fetch
   */
  async fetchHTML(url, options = {}) {
    const response = await this.rateLimitedFetch(url, {
      ...options,
      headers: {
        Accept: 'text/html',
        ...options.headers,
      },
    });
    return response.text();
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 검색 쿼리 빌드 (서브클래스에서 구현)
   */
  buildSearchQuery(_params) {
    throw new Error('buildSearchQuery must be implemented by subclass');
  }

  /**
   * 채용공고 검색 (서브클래스에서 구현)
   */
  async searchJobs(_params) {
    throw new Error('searchJobs must be implemented by subclass');
  }

  /**
   * 채용공고 상세 조회 (서브클래스에서 구현)
   */
  async getJobDetail(_jobId) {
    throw new Error('getJobDetail must be implemented by subclass');
  }

  /**
   * 결과 정규화 (서브클래스에서 구현)
   */
  normalizeJob(_rawJob) {
    throw new Error('normalizeJob must be implemented by subclass');
  }

  /**
   * 로그인 상태 확인 (서브클래스에서 구현)
   */
  async checkAuth() {
    return { authenticated: false };
  }

  /**
   * 지원하기 (서브클래스에서 구현)
   */
  async applyToJob(_jobId, _applicationData) {
    throw new Error('applyToJob must be implemented by subclass');
  }
}

/**
 * 정규화된 채용공고 형식
 */
export const NormalizedJobSchema = {
  id: '', // 고유 ID
  source: '', // 출처 (wanted, jobkorea, saramin, linkedin)
  sourceUrl: '', // 원본 URL
  position: '', // 직무명
  company: '', // 회사명
  companyId: '', // 회사 ID
  location: '', // 위치
  experienceMin: 0, // 최소 경력
  experienceMax: 0, // 최대 경력
  salary: '', // 급여
  techStack: [], // 기술 스택
  description: '', // 상세 설명
  requirements: '', // 자격 요건
  benefits: '', // 복리후생
  dueDate: null, // 마감일
  postedDate: null, // 게시일
  isRemote: false, // 원격근무 여부
  employmentType: '', // 고용형태 (정규직, 계약직 등)
  crawledAt: null, // 크롤링 시간
};

export default BaseCrawler;

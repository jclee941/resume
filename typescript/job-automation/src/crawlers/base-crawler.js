/**
 * Base Crawler - 채용 사이트 크롤러 기본 클래스
 *
 * Provides configurable retry with exponential backoff, jitter,
 * status-code-aware retry decisions, and Retry-After header support.
 */

import { EventEmitter } from 'events';
import { HumanizedTimer, CookieJar, CaptchaDetector } from '../shared/services/stealth/index.js';

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

/**
 * Default retry configuration for all crawlers.
 * Override per-instance via `options.retry` or per-request via `rateLimitedFetch(url, { retry })`.
 *
 * @type {RetryConfig}
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterFactor: 0.3,
  retryableStatuses: [429, 500, 502, 503, 504],
};

/**
 * @typedef {object} RetryConfig
 * @property {number} maxRetries    - Maximum retry attempts (default: 3)
 * @property {number} baseDelay     - Base delay in ms for exponential backoff (default: 1000)
 * @property {number} maxDelay      - Maximum delay cap in ms (default: 30000)
 * @property {number} jitterFactor  - Random jitter multiplier 0-1 (default: 0.3)
 * @property {number[]} retryableStatuses - HTTP status codes eligible for retry
 */

/**
 * @typedef {object} RetryMetrics
 * @property {number} totalRetries        - Total retry attempts across all requests
 * @property {number} successAfterRetry   - Requests that succeeded after at least one retry
 * @property {number} exhaustedRetries    - Requests that failed after all retries exhausted
 * @property {number} nonRetryableFailures - Requests that failed with non-retryable status
 * @property {Date|null} lastRetryAt      - Timestamp of the most recent retry
 */

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

    /** @type {RetryConfig} */
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: this.maxRetries,
      ...options.retry,
    };

    /** @type {RetryMetrics} */
    this.retryMetrics = {
      totalRetries: 0,
      successAfterRetry: 0,
      exhaustedRetries: 0,
      nonRetryableFailures: 0,
      lastRetryAt: null,
    };

    /** @type {HumanizedTimer} */
    this.timer = new HumanizedTimer(options.timing);

    /** @type {CookieJar} */
    this.cookieJar = new CookieJar();

    /** @type {CaptchaDetector} */
    this.captchaDetector = new CaptchaDetector(options.captcha);
  }

  /**
   * Calculate exponential backoff delay with jitter.
   *
   * Formula: min(baseDelay * 2^(attempt-1), maxDelay) * (1 + random * jitterFactor)
   *
   * @param {number} attempt - Current attempt number (1-based)
   * @param {RetryConfig} config - Retry configuration
   * @returns {number} Delay in milliseconds
   */
  _calculateBackoff(attempt, config) {
    const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
    const jitter = 1 + Math.random() * config.jitterFactor;
    return Math.round(cappedDelay * jitter);
  }

  /**
   * Determine whether a given HTTP status code is retryable.
   *
   * - `null` (network error, no response) is always retryable.
   * - 4xx errors (except 429 Too Many Requests) are NOT retryable.
   * - Retryable statuses are checked against `config.retryableStatuses`.
   *
   * @param {number|null} statusCode - HTTP status code or null for network errors
   * @param {RetryConfig} config - Retry configuration
   * @returns {boolean}
   */
  _isRetryable(statusCode, config) {
    if (statusCode === null) return true; // network errors are retryable
    return config.retryableStatuses.includes(statusCode);
  }

  /**
   * Rate-limited fetch with configurable exponential backoff and retry.
   *
   * Supports per-request retry overrides via `options.retry`.
   * Emits events: `retry`, `retry:success`, `retry:non-retryable`, `retry:exhausted`.
   *
   * @param {string} url - Request URL
   * @param {object} [options={}] - Fetch options + optional `retry` overrides
   * @returns {Promise<Response>}
   */
  async rateLimitedFetch(url, options = {}) {
    // Humanized timing — replaces simple rate-limit sleep
    await this.timer.wait();
    this.lastRequestTime = Date.now();

    // Separate retry overrides from fetch options
    const { retry: retryOverride, ...restOptions } = options;
    const retryConfig = { ...this.retryConfig, ...retryOverride };

    // Merge manual cookies with cookie jar
    const jarCookies = this.cookieJar.getCookieHeader(url);
    const combinedCookies = [this.cookies, jarCookies].filter(Boolean).join('; ');

    const fetchOptions = {
      method: restOptions.method || 'GET',
      headers: {
        ...this.headers,
        ...restOptions.headers,
        ...(combinedCookies ? { Cookie: combinedCookies } : {}),
      },
      signal: AbortSignal.timeout(this.timeout),
      ...restOptions,
    };

    let lastError;
    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          error.statusCode = response.status;

          // Parse Retry-After header for 429 responses
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              const parsed = Number(retryAfter);
              if (!Number.isNaN(parsed)) {
                error.retryAfter = parsed * 1000; // convert seconds to ms
              }
            }
          }

          throw error;
        }

        // Success after retry — track metrics
        if (attempt > 1) {
          this.retryMetrics.successAfterRetry++;
          this.emit('retry:success', {
            url,
            attempt,
            maxRetries: retryConfig.maxRetries,
            crawler: this.name,
          });
        }

        // Store response cookies in jar
        const setCookieHeader = response.headers.get('Set-Cookie');
        if (setCookieHeader) {
          this.cookieJar.setCookiesFromHeader(setCookieHeader, url);
        }

        // Detect CAPTCHA from response status/headers
        const captchaResult = this.captchaDetector.detectFromStatusCode(
          response.status,
          response.headers,
          url
        );
        if (captchaResult.detected) {
          this.emit('captcha:detected', captchaResult);
          if (this.captchaDetector.shouldPause()) {
            this.emit('captcha:paused', { url, crawler: this.name });
            await this.sleep(30000);
          }
        }

        return response;
      } catch (error) {
        lastError = error;
        const statusCode = error.statusCode || null;

        // Non-retryable error — fail immediately
        if (!this._isRetryable(statusCode, retryConfig)) {
          this.retryMetrics.nonRetryableFailures++;
          this.emit('retry:non-retryable', {
            url,
            attempt,
            maxRetries: retryConfig.maxRetries,
            statusCode,
            error: error.message,
            crawler: this.name,
          });
          throw error;
        }

        // Retryable — emit event and wait before next attempt
        this.retryMetrics.totalRetries++;
        this.retryMetrics.lastRetryAt = new Date();

        const delay = error.retryAfter || this._calculateBackoff(attempt, retryConfig);

        this.emit('retry', {
          url,
          attempt,
          maxRetries: retryConfig.maxRetries,
          delay,
          statusCode,
          error: error.message,
          crawler: this.name,
        });

        if (attempt < retryConfig.maxRetries) {
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    this.retryMetrics.exhaustedRetries++;
    this.emit('retry:exhausted', {
      url,
      maxRetries: retryConfig.maxRetries,
      error: lastError.message,
      crawler: this.name,
    });

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
   * Get current retry metrics snapshot.
   * @returns {RetryMetrics}
   */
  getRetryMetrics() {
    return { ...this.retryMetrics };
  }

  /**
   * Reset retry metrics to zero.
   */
  resetRetryMetrics() {
    this.retryMetrics = {
      totalRetries: 0,
      successAfterRetry: 0,
      exhaustedRetries: 0,
      nonRetryableFailures: 0,
      lastRetryAt: null,
    };
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

export { DEFAULT_RETRY_CONFIG };
export default BaseCrawler;

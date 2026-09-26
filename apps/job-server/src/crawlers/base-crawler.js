/**
 * Base Crawler - 채용 사이트 크롤러 기본 클래스
 *
 * Provides configurable retry with exponential backoff, jitter,
 * status-code-aware retry decisions, and Retry-After header support.
 */

import { EventEmitter } from 'events';
import {
  HumanizedTimer,
  CookieJar,
  CaptchaDetector,
  ProxyRotator,
  TLSFingerprintManager,
} from '../shared/services/stealth/index.js';
import { getRandomUA } from '@resume/shared/ua';
import { rateLimitedFetch as executeRateLimitedFetch } from './base-crawler/request.js';
import { calculateBackoff, isRetryable } from './base-crawler/retry.js';
import {
  createRetryMetrics,
  DEFAULT_RETRY_CONFIG,
  NormalizedJobSchema,
} from './base-crawler/schema.js';
import { loadUndici, resolveDispatcher, resolveFingerprint } from './base-crawler/tls.js';

/**
 * @typedef {import('./base-crawler/tls.js').TlsFingerprint} TlsFingerprint
 * @typedef {import('./base-crawler/schema.js').RetryConfig} RetryConfig
 * @typedef {import('./base-crawler/schema.js').RetryMetrics} RetryMetrics
 * @typedef {import('./base-crawler/request.js').RequestOptions} RequestOptions
 * @typedef {import('../shared/services/stealth/proxy-rotator.js').ProxyConfig} ProxyConfig
 * @typedef {import('../shared/services/stealth/timing.js').TimingConfig} TimingConfig
 * @typedef {import('../shared/services/stealth/captcha-detector.js').CaptchaDetectorOptions} CaptchaDetectorOptions
 * @typedef {import('../shared/services/stealth/tls-fingerprint.js').TLSFingerprintManager} TLSFingerprintManagerType
 *
 * @typedef {{
 *   baseUrl?: string;
 *   rateLimit?: number;
 *   maxRetries?: number;
 *   timeout?: number;
 *   headers?: Record<string, string>;
 *   cookies?: string;
 *   userAgent?: string;
 *   retry?: Partial<RetryConfig>;
 *   timing?: Partial<TimingConfig>;
 *   captcha?: Partial<CaptchaDetectorOptions>;
 *   proxies?: ProxyConfig[];
 *   proxyRotator?: import('../shared/services/stealth/proxy-rotator.js').ProxyRotator;
 *   tlsFingerprintManager?: TLSFingerprintManagerType;
 *   tlsFingerprint?: {
 *     enabled?: boolean;
 *     rotatePerRequest?: boolean;
 *     platform?: string;
 *     browser?: string;
 *   };
 * }} BaseCrawlerOptions
 */

export class BaseCrawler extends EventEmitter {
  /**
   * @param {string} name
   * @param {BaseCrawlerOptions} [options]
   */
  constructor(name, options = {}) {
    super();
    this.setMaxListeners(15);
    this.name = name;
    this.baseUrl = options.baseUrl || '';
    this.rateLimit = options.rateLimit || 1000;
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
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: this.maxRetries,
      ...options.retry,
    };
    this.retryMetrics = createRetryMetrics();
    this.timer = new HumanizedTimer(options.timing);
    this.cookieJar = new CookieJar();
    this.captchaDetector = new CaptchaDetector(options.captcha);
    this.proxyRotator =
      options.proxyRotator ||
      new ProxyRotator(Array.isArray(options.proxies) ? options.proxies : []);
    this.tlsFingerprintManager = options.tlsFingerprintManager || new TLSFingerprintManager();
    this.tlsOptions = {
      enabled: options.tlsFingerprint?.enabled ?? true,
      rotatePerRequest: options.tlsFingerprint?.rotatePerRequest ?? true,
      platform: options.tlsFingerprint?.platform,
      browser: options.tlsFingerprint?.browser,
    };
    /** @type {string | null} */
    this.currentProxy = null;
    this.currentFingerprint = this.tlsFingerprintManager.getRandomFingerprint({
      platform: this.tlsOptions.platform,
      browser: this.tlsOptions.browser,
    });

    if (!options.userAgent && this.currentFingerprint?.userAgent) {
      this.headers['User-Agent'] = this.currentFingerprint.userAgent;
    }

    this._dispatchers = new Map();
    /** @type {typeof import('undici') | null} */
    this._undici = null;
    this._undiciLoadFailed = false;
  }

  destroy() {
    this.captchaDetector?.destroy();
    for (const dispatcher of this._dispatchers.values()) {
      dispatcher?.destroy?.();
    }

    this._dispatchers.clear();
    this.removeAllListeners();
  }

  async _loadUndici() {
    return /** @type {typeof loadUndici & { call(thisArg: unknown): Promise<typeof import('undici') | null | undefined> }} */ (
      loadUndici
    ).call(this);
  }

  /**
   * @param {string | null} proxyUrl
   * @returns {TlsFingerprint | null}
   */
  _resolveFingerprint(proxyUrl) {
    return /** @type {typeof resolveFingerprint & { call(thisArg: unknown, proxyUrl: string | null): TlsFingerprint | null }} */ (
      resolveFingerprint
    ).call(this, proxyUrl);
  }

  /**
   * @param {string | null} proxyUrl
   * @param {TlsFingerprint | null} fingerprint
   * @returns {Promise<unknown>}
   */
  async _resolveDispatcher(proxyUrl, fingerprint) {
    return /** @type {typeof resolveDispatcher & { call(thisArg: unknown, proxyUrl: string | null, fingerprint: TlsFingerprint | null): Promise<unknown> }} */ (
      resolveDispatcher
    ).call(this, proxyUrl, fingerprint);
  }

  /**
   * @param {number} attempt
   * @param {RetryConfig} config
   * @returns {number}
   */
  _calculateBackoff(attempt, config) {
    return calculateBackoff(attempt, config);
  }

  /**
   * @param {number | null} statusCode
   * @param {RetryConfig} config
   * @returns {boolean}
   */
  _isRetryable(statusCode, config) {
    return isRetryable(statusCode, config);
  }

  /**
   * @param {string | URL} url
   * @param {RequestOptions} [options]
   * @returns {Promise<Response>}
   */
  async rateLimitedFetch(url, options = {}) {
    return /** @type {typeof executeRateLimitedFetch & { call(thisArg: unknown, url: string | URL, options?: RequestOptions): Promise<Response> }} */ (
      executeRateLimitedFetch
    ).call(this, url, options);
  }

  /**
   * @param {string | URL} url
   * @param {RequestOptions} [options]
   * @returns {Promise<unknown>}
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
   * @param {string | URL} url
   * @param {RequestOptions} [options]
   * @returns {Promise<string>}
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
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getRetryMetrics() {
    return { ...this.retryMetrics };
  }

  /**
   * @param {Record<string, unknown>} _params
   * @returns {string}
   */
  buildSearchQuery(_params) {
    throw new Error('buildSearchQuery must be implemented by subclass');
  }

  /**
   * @param {Record<string, unknown>} [_params]
   * @returns {Promise<unknown>}
   */
  async searchJobs(_params) {
    throw new Error('searchJobs must be implemented by subclass');
  }

  /**
   * @param {string | number} _jobId
   * @returns {Promise<unknown>}
   */
  async getJobDetail(_jobId) {
    throw new Error('getJobDetail must be implemented by subclass');
  }

  /**
   * @param {Record<string, unknown>} _rawJob
   * @returns {unknown}
   */
  normalizeJob(_rawJob) {
    throw new Error('normalizeJob must be implemented by subclass');
  }

  /**
   * @returns {Promise<{ authenticated: boolean; [key: string]: unknown }>}
   */
  async checkAuth() {
    return { authenticated: false };
  }

  /**
   * @param {string | number} _jobId
   * @param {Record<string, unknown>} _applicationData
   * @returns {Promise<unknown>}
   */
  async applyToJob(_jobId, _applicationData) {
    throw new Error('applyToJob must be implemented by subclass');
  }
}

export { DEFAULT_RETRY_CONFIG, NormalizedJobSchema };
export default BaseCrawler;

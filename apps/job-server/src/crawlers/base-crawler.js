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

export class BaseCrawler extends EventEmitter {
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
    this.currentProxy = null;
    this.currentFingerprint = this.tlsFingerprintManager.getRandomFingerprint({
      platform: this.tlsOptions.platform,
      browser: this.tlsOptions.browser,
    });

    if (!options.userAgent && this.currentFingerprint?.userAgent) {
      this.headers['User-Agent'] = this.currentFingerprint.userAgent;
    }

    this._dispatchers = new Map();
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
    return loadUndici.call(this);
  }

  _resolveFingerprint(proxyUrl) {
    return resolveFingerprint.call(this, proxyUrl);
  }

  async _resolveDispatcher(proxyUrl, fingerprint) {
    return resolveDispatcher.call(this, proxyUrl, fingerprint);
  }

  _calculateBackoff(attempt, config) {
    return calculateBackoff(attempt, config);
  }

  _isRetryable(statusCode, config) {
    return isRetryable(statusCode, config);
  }

  async rateLimitedFetch(url, options = {}) {
    return executeRateLimitedFetch.call(this, url, options);
  }

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

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getRetryMetrics() {
    return { ...this.retryMetrics };
  }

  resetRetryMetrics() {
    this.retryMetrics = createRetryMetrics();
  }

  buildSearchQuery(_params) {
    throw new Error('buildSearchQuery must be implemented by subclass');
  }

  async searchJobs(_params) {
    throw new Error('searchJobs must be implemented by subclass');
  }

  async getJobDetail(_jobId) {
    throw new Error('getJobDetail must be implemented by subclass');
  }

  normalizeJob(_rawJob) {
    throw new Error('normalizeJob must be implemented by subclass');
  }

  async checkAuth() {
    return { authenticated: false };
  }

  async applyToJob(_jobId, _applicationData) {
    throw new Error('applyToJob must be implemented by subclass');
  }
}

export { DEFAULT_RETRY_CONFIG, NormalizedJobSchema };
export default BaseCrawler;

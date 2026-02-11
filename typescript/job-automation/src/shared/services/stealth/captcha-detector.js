/**
 * @fileoverview CAPTCHA detection and notification.
 *
 * Scans HTML content and HTTP responses for CAPTCHA challenges.
 * Tracks detection history and supports auto-pause when too many
 * CAPTCHAs are encountered in a short window.
 *
 * @module shared/services/stealth/captcha-detector
 */

import { EventEmitter } from 'events';

/**
 * @typedef {object} CaptchaDetection
 * @property {string} type - 'recaptcha' | 'hcaptcha' | 'cloudflare' | 'unknown'
 * @property {string} url - URL where detected
 * @property {number} timestamp
 * @property {string} [siteKey] - If extractable from HTML
 */

/**
 * @typedef {object} CaptchaDetectorOptions
 * @property {Function} [notifyCallback] - Async callback for notifications
 * @property {number} [maxDetectionsBeforePause] - Threshold before auto-pause (default: 3)
 * @property {number} [pauseDurationMs] - Auto-pause duration in ms (default: 60000)
 * @property {number} [rollingWindowMs] - Rolling window for detection count (default: 300000 / 5 min)
 */

/** Known CAPTCHA signature patterns */
const CAPTCHA_SIGNATURES = [
  {
    type: 'recaptcha',
    patterns: ['google.com/recaptcha', 'g-recaptcha', 'grecaptcha'],
    siteKeyRegex: /data-sitekey="([^"]+)"/,
  },
  {
    type: 'hcaptcha',
    patterns: ['hcaptcha.com', 'h-captcha'],
    siteKeyRegex: /data-sitekey="([^"]+)"/,
  },
  {
    type: 'cloudflare',
    patterns: ['cf-challenge', 'cf_chl_opt', 'challenges.cloudflare.com', 'Just a moment'],
    siteKeyRegex: null,
  },
];

/** @type {CaptchaDetectorOptions} */
const DEFAULT_OPTIONS = {
  notifyCallback: null,
  maxDetectionsBeforePause: 3,
  pauseDurationMs: 60000,
  rollingWindowMs: 300000,
};

/**
 * Detects CAPTCHA challenges in HTML content and HTTP responses.
 * Emits 'captcha:detected' events with CaptchaDetection payloads.
 */
export class CaptchaDetector extends EventEmitter {
  /**
   * @param {Partial<CaptchaDetectorOptions>} options
   */
  constructor(options = {}) {
    super();
    /** @type {CaptchaDetectorOptions} */
    this.options = { ...DEFAULT_OPTIONS, ...options };

    /** @type {CaptchaDetection[]} */
    this._history = [];
  }

  /**
   * Scan HTML content for CAPTCHA signatures.
   * @param {string} html - HTML content to scan
   * @param {string} url - URL where the HTML was fetched from
   * @returns {CaptchaDetection|null}
   */
  detectInHtml(html, url) {
    if (!html) return null;

    const lowerHtml = html.toLowerCase();

    for (const sig of CAPTCHA_SIGNATURES) {
      const matched = sig.patterns.some((pattern) => lowerHtml.includes(pattern.toLowerCase()));
      if (!matched) continue;

      /** @type {CaptchaDetection} */
      const detection = {
        type: sig.type,
        url,
        timestamp: Date.now(),
      };

      // Try to extract site key
      if (sig.siteKeyRegex) {
        const match = html.match(sig.siteKeyRegex);
        if (match) detection.siteKey = match[1];
      }

      this._record(detection);
      return detection;
    }

    return null;
  }

  /**
   * Check HTTP response for CAPTCHA challenges (Cloudflare 403/503 patterns).
   * @param {number} statusCode - HTTP status code
   * @param {Record<string, string>} headers - Response headers (lowercase keys)
   * @param {string} url - Request URL
   * @returns {CaptchaDetection|null}
   */
  detectFromStatusCode(statusCode, headers, url) {
    if (!headers) return null;

    // Normalize header keys to lowercase
    const normalizedHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
      normalizedHeaders[key.toLowerCase()] = value;
    }

    const isCfChallenge =
      (statusCode === 403 || statusCode === 503) &&
      (normalizedHeaders['cf-mitigated'] ||
        normalizedHeaders['cf-chl-bypass'] ||
        normalizedHeaders['server'] === 'cloudflare');

    if (!isCfChallenge) return null;

    /** @type {CaptchaDetection} */
    const detection = {
      type: 'cloudflare',
      url,
      timestamp: Date.now(),
    };

    this._record(detection);
    return detection;
  }

  /**
   * Check if crawling should pause due to too many CAPTCHA detections.
   * Uses a rolling window (default 5 minutes).
   * @returns {boolean}
   */
  shouldPause() {
    const windowStart = Date.now() - this.options.rollingWindowMs;
    const recentCount = this._history.filter((d) => d.timestamp > windowStart).length;
    return recentCount >= this.options.maxDetectionsBeforePause;
  }

  /**
   * Send notification if callback is configured.
   * @param {CaptchaDetection} detection
   * @returns {Promise<void>}
   */
  async notifyIfConfigured(detection) {
    if (typeof this.options.notifyCallback === 'function') {
      try {
        await this.options.notifyCallback(detection);
      } catch {
        // Notification failure should not break crawling
      }
    }
  }

  /**
   * Get full detection history.
   * @returns {CaptchaDetection[]}
   */
  getDetectionHistory() {
    return [...this._history];
  }

  /**
   * Clear detection history.
   */
  clearHistory() {
    this._history = [];
  }

  /** @returns {number} Total detections */
  get detectionCount() {
    return this._history.length;
  }

  /**
   * Count of detections in the rolling window (default 5 minutes).
   * @returns {number}
   */
  get recentDetectionCount() {
    const windowStart = Date.now() - this.options.rollingWindowMs;
    return this._history.filter((d) => d.timestamp > windowStart).length;
  }

  /**
   * Record a detection, emit event, and notify.
   * @param {CaptchaDetection} detection
   * @private
   */
  _record(detection) {
    this._history.push(detection);
    this.emit('captcha:detected', detection);
    this.notifyIfConfigured(detection);
  }
}

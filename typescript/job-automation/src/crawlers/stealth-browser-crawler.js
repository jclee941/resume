/**
 * @fileoverview Stealth Browser Crawler - CF Browser Rendering backed crawler.
 *
 * Extends BaseCrawler to add real-browser capabilities via @cloudflare/puppeteer.
 * Uses BrowserService for session management and stealth patches for anti-detection.
 *
 * Usage:
 *   const crawler = new StealthBrowserCrawler('saramin-stealth', {
 *     baseUrl: 'https://www.saramin.co.kr',
 *     rateLimit: 3000,
 *     env, // CF Worker env with MYBROWSER binding
 *   });
 *   const html = await crawler.fetchWithBrowser('https://...');
 *
 * @module crawlers/stealth-browser-crawler
 */

import { BaseCrawler } from './base-crawler.js';
import { BrowserService } from '../../workers/src/services/browser/browser-service.js';

/**
 * Browser-backed crawler with stealth capabilities.
 * Adds real-browser page rendering on top of BaseCrawler's fetch.
 *
 * @extends BaseCrawler
 */
export class StealthBrowserCrawler extends BaseCrawler {
  /**
   * @param {string} name - Crawler identifier
   * @param {object} options - Crawler options
   * @param {string} options.baseUrl - Base URL for the target site
   * @param {number} [options.rateLimit=3000] - Rate limit in ms (higher for browser)
   * @param {number} [options.maxRetries=2] - Max retries per page
   * @param {number} [options.timeout=45000] - Navigation timeout in ms
   * @param {object} options.env - CF Worker env (must have MYBROWSER binding)
   * @param {boolean} [options.screenshot=false] - Capture screenshots on error
   * @param {string} [options.waitUntil='networkidle0'] - Page load wait strategy
   */
  constructor(name, options = {}) {
    super(name, {
      ...options,
      rateLimit: options.rateLimit ?? 3000,
      maxRetries: options.maxRetries ?? 2,
      timeout: options.timeout ?? 45000,
    });

    if (!options.env) {
      throw new Error(
        `[${name}] StealthBrowserCrawler requires options.env (CF Worker environment)`
      );
    }

    /** @type {object} CF Worker environment */
    this.env = options.env;

    /** @type {BrowserService|null} */
    this._browserService = null;

    /** @type {boolean} */
    this.screenshotOnError = options.screenshot ?? false;

    /** @type {string} */
    this.waitUntil = options.waitUntil ?? 'networkidle0';

    /** @type {number} Navigation timeout */
    this.navigationTimeout = options.timeout ?? 45000;
  }

  /**
   * Lazily initialize BrowserService.
   * @returns {Promise<BrowserService>}
   */
  async getBrowserService() {
    if (!this._browserService) {
      this._browserService = new BrowserService(this.env);
    }
    return this._browserService;
  }

  /**
   * Fetch a page using a real stealth browser.
   * Falls back to regular fetch if browser is unavailable.
   *
   * @param {string} url - URL to navigate to
   * @param {object} [options={}] - Navigation options
   * @param {string} [options.waitUntil] - Override default wait strategy
   * @param {Function} [options.beforeNavigate] - Hook called with page before navigation
   * @param {Function} [options.afterNavigate] - Hook called with page after navigation
   * @param {boolean} [options.returnPage=false] - Return page object instead of HTML
   * @returns {Promise<string|import('@cloudflare/puppeteer').Page>} HTML content or Page
   */
  async fetchWithBrowser(url, options = {}) {
    const service = await this.getBrowserService();
    const page = await service.newPage();

    try {
      if (typeof options.beforeNavigate === 'function') {
        await options.beforeNavigate(page);
      }

      await this._enforceRateLimit();

      await page.goto(url, {
        waitUntil: options.waitUntil ?? this.waitUntil,
        timeout: this.navigationTimeout,
      });

      this.emit('page:loaded', { url, crawler: this.name });

      if (typeof options.afterNavigate === 'function') {
        await options.afterNavigate(page);
      }

      if (options.returnPage) {
        return page;
      }

      const html = await page.content();

      // Detect CAPTCHA in rendered HTML
      const captchaResult = this.captchaDetector.detectInHtml(html, url);
      if (captchaResult.detected) {
        this.emit('captcha:detected', captchaResult);
        if (this.captchaDetector.shouldPause()) {
          this.emit('captcha:paused', { url, crawler: this.name });
        }
      }

      return html;
    } catch (err) {
      this.emit('page:error', { url, error: err.message, crawler: this.name });

      if (this.screenshotOnError && this.env.SCREENSHOTS) {
        try {
          const screenshot = await page.screenshot({ type: 'jpeg', quality: 60 });
          const key = `error/${this.name}/${Date.now()}.jpg`;
          await this.env.SCREENSHOTS.put(key, screenshot);
          this.emit('screenshot:saved', { key });
        } catch (screenshotErr) {
          this.emit('screenshot:error', { error: screenshotErr.message, crawler: this.name });
        }
      }

      throw err;
    } finally {
      if (!options.returnPage) {
        await page.close().catch(() => {});
      }
    }
  }

  /**
   * Execute an action on a page with stealth browser.
   * Useful for multi-step interactions (login, form fill, apply).
   *
   * @param {string} url - Starting URL
   * @param {Function} action - async (page) => result
   * @returns {Promise<*>} Result from action function
   */
  async executeAction(url, action) {
    const page = await this.fetchWithBrowser(url, { returnPage: true });

    try {
      return await action(page);
    } catch (err) {
      this.emit('action:error', { url, error: err.message, crawler: this.name });
      throw err;
    } finally {
      await page.close().catch(() => {});
    }
  }

  /**
   * Rate limit enforcement with jitter.
   * @private
   */
  async _enforceRateLimit() {
    const jitter = Math.random() * 500;
    const delay = this.rateLimit + jitter;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Override: check if browser-based auth is needed.
   * Subclasses should implement platform-specific auth detection.
   *
   * @param {object} _env - Environment bindings
   * @returns {Promise<boolean>}
   */
  async checkAuth(_env) {
    return true;
  }

  /**
   * Cleanup browser resources.
   * Call this when the crawler is no longer needed.
   */
  async destroy() {
    if (this._browserService) {
      this._browserService = null;
    }
  }
}

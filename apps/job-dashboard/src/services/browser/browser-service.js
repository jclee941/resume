/**
 * @fileoverview Cloudflare Browser Rendering service.
 *
 * Manages browser sessions via @cloudflare/puppeteer with stealth patches.
 * Designed for Cloudflare Workers environment (no Node.js globals).
 *
 * @module browser-service
 */

import puppeteer from '@cloudflare/puppeteer';
import { generateFingerprint, applyStealthPatches, humanDelay } from './stealth-patches.js';

/**
 * @typedef {Object} BrowserServiceConfig
 * @property {number} [sessionTtlMs=60000] - Max session lifetime in ms
 * @property {number} [pageTimeoutMs=30000] - Navigation timeout in ms
 * @property {boolean} [stealth=true] - Enable stealth patches
 * @property {string} [acceptLanguage] - Override Accept-Language header
 */

/**
 * @typedef {Object} BrowseResult
 * @property {string} content - Page HTML content
 * @property {number} status - HTTP status code
 * @property {string} url - Final URL after redirects
 * @property {Object.<string, string>} cookies - Response cookies
 * @property {number} durationMs - Total browse time in ms
 */

/**
 * Browser service for Cloudflare Workers.
 * Wraps @cloudflare/puppeteer with session management and stealth.
 */
export class BrowserService {
  /** @type {import('@cloudflare/puppeteer').Browser | null} */
  #browser = null;

  /** @type {ReturnType<typeof generateFingerprint> | null} */
  #fingerprint = null;

  /** @type {BrowserServiceConfig} */
  #config;

  /** @type {Object} CF Worker env bindings */
  #env;

  /**
   * @param {Object} env - Cloudflare Worker environment bindings (must include BROWSER)
   * @param {BrowserServiceConfig} [config={}]
   */
  constructor(env, config = {}) {
    this.#env = env;
    this.#config = {
      sessionTtlMs: config.sessionTtlMs ?? 60_000,
      pageTimeoutMs: config.pageTimeoutMs ?? 30_000,
      stealth: config.stealth ?? true,
      acceptLanguage: config.acceptLanguage,
    };
  }

  /**
   * Launch or reuse a browser session.
   * @returns {Promise<import('@cloudflare/puppeteer').Browser>}
   */
  async #ensureBrowser() {
    if (this.#browser?.isConnected()) {
      return this.#browser;
    }

    this.#browser = await puppeteer.launch(this.#env.MYBROWSER);
    this.#fingerprint = generateFingerprint();

    if (this.#config.acceptLanguage) {
      this.#fingerprint.acceptLanguage = this.#config.acceptLanguage;
    }

    return this.#browser;
  }

  /**
   * Create a new stealth page.
   *
   * @returns {Promise<import('@cloudflare/puppeteer').Page>}
   */
  async newPage() {
    const browser = await this.#ensureBrowser();
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(this.#config.pageTimeoutMs);
    page.setDefaultTimeout(this.#config.pageTimeoutMs);

    if (this.#config.stealth) {
      await applyStealthPatches(page, this.#fingerprint);
    }

    return page;
  }

  /**
   * Browse a URL with stealth and return structured result.
   *
   * @param {string} url - Target URL
   * @param {Object} [options={}]
   * @param {string} [options.waitForSelector] - CSS selector to wait for
   * @param {number} [options.waitMs] - Additional wait after load
   * @param {boolean} [options.screenshot=false] - Capture screenshot
   * @returns {Promise<BrowseResult & {screenshot?: Buffer}>}
   */
  async browse(url, options = {}) {
    const start = Date.now();
    const page = await this.newPage();

    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.#config.pageTimeoutMs,
      });

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: this.#config.pageTimeoutMs,
        });
      }

      if (options.waitMs) {
        await humanDelay(page, options.waitMs, options.waitMs + 500);
      }

      const content = await page.content();
      const cookies = await page.cookies();

      /** @type {BrowseResult} */
      const result = {
        content,
        status: response?.status() ?? 0,
        url: page.url(),
        cookies: Object.fromEntries(cookies.map((c) => [c.name, c.value])),
        durationMs: Date.now() - start,
      };

      if (options.screenshot) {
        result.screenshot = await page.screenshot({ type: 'png', fullPage: false });
      }

      return result;
    } finally {
      await page.close().catch(() => {});
    }
  }

  /**
   * Execute a custom function within a stealth page context.
   *
   * @template T
   * @param {string} url - Starting URL
   * @param {(page: import('@cloudflare/puppeteer').Page) => Promise<T>} fn - Custom page logic
   * @returns {Promise<T>}
   */
  async withPage(url, fn) {
    const page = await this.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.#config.pageTimeoutMs,
      });

      return await fn(page);
    } finally {
      await page.close().catch(() => {});
    }
  }

  /**
   * Close the browser and release resources.
   * @returns {Promise<void>}
   */
  async close() {
    if (this.#browser) {
      await this.#browser.close().catch(() => {});
      this.#browser = null;
      this.#fingerprint = null;
    }
  }

  /**
   * Get current session fingerprint (for debugging).
   * @returns {ReturnType<typeof generateFingerprint> | null}
   */
  getFingerprint() {
    return this.#fingerprint ? { ...this.#fingerprint } : null;
  }
}

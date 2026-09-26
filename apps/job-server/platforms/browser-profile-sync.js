/**
 * BrowserProfileSync — reusable browser-automation scaffold for job platforms.
 *
 * Platforms configure URLs, selectors, and field mappings. The base class
 * handles login check, manual login wait, profile extraction, diff-based
 * selective sync, and generic form filling.
 */
import { chromium } from 'playwright';
import { BaseProfileSync } from './base-profile-sync.js';
import {
  fillCareers,
  fillCertifications,
  fillEducation,
  fillPersonalInfo,
  saveProfile,
  waitForAnyConfiguredSelector,
  waitForConfiguredEditSelectors,
  waitForConfiguredProfileSelectors,
} from './browser-profile-form.js';
import { executeProfileSync } from './browser-profile-sync-runner.js';

/**
 * @typedef {import('./browser-profile-form.js').ProfileSyncSelectors & {
 *   school?: string,
 *   major?: string,
 *   [key: string]: string | undefined
 * }} BrowserProfileSelectors
 */

/**
 * @typedef {Object} BrowserProfileSyncOptions
 * @property {string} [platform]
 * @property {Record<string, string>} [urls]
 * @property {BrowserProfileSelectors} [selectors]
 * @property {string} [sessionPath]
 * @property {boolean} [headless]
 * @property {number} [timeout]
 * @property {boolean} [debug]
 */

export class BrowserProfileSync extends BaseProfileSync {
  /**
   * @param {BrowserProfileSyncOptions} [options]
   */
  constructor(options = {}) {
    super(options);
    /** @type {string} */
    this.platform = options.platform || 'unknown';
    /** @type {Record<string, string>} */
    this.urls = options.urls || {};
    /** @type {BrowserProfileSelectors} */
    this.selectors = options.selectors || {};
    /** @type {string | undefined} */
    this.sessionPath = options.sessionPath;
  }

  async init() {
    this.browser = await chromium.launch({
      headless: this.headless,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    if (this.sessionPath) {
      const { existsSync, readFileSync } = await import('fs');
      if (existsSync(this.sessionPath)) {
        const session = JSON.parse(readFileSync(this.sessionPath, 'utf-8'));
        if (session.cookies?.length) {
          await context.addCookies(session.cookies);
        }
      }
    }

    this.page = await context.newPage();
    return this;
  }

  async checkLogin() {
    if (!this.page || !this.urls.profile) return false;
    await this.page.goto(this.urls.profile, { waitUntil: 'domcontentloaded' });
    const url = this.page.url();
    return !url.includes('/login') && !url.includes('/auth');
  }

  async waitForManualLogin() {
    if (!this.urls.login) throw new Error('login URL not configured');
    await /** @type {import('playwright').Page} */ (this.page).goto(this.urls.login, {
      waitUntil: 'domcontentloaded',
    });
    console.log(`[${this.platform}] Please login manually...`);
    await /** @type {import('playwright').Page} */ (this.page).waitForURL('**/mypage/**', {
      timeout: 300000,
    });

    const cookies = await /** @type {import('playwright').Page} */ (this.page).context().cookies();
    if (this.sessionPath) {
      const { writeFileSync, mkdirSync } = await import('fs');
      const { dirname } = await import('path');
      mkdirSync(dirname(this.sessionPath), { recursive: true });
      writeFileSync(this.sessionPath, JSON.stringify({ cookies }, null, 2));
    }
    console.log(`[${this.platform}] Login successful, session saved.`);
    return true;
  }

  async getProfile() {
    if (!this.page) {
      return { success: false, code: 'NOT_INITIALIZED', data: null };
    }
    await this.page.goto(this.urls.profile, { waitUntil: 'domcontentloaded' });
    const url = this.page.url();
    if (url.includes('/login') || url.includes('/auth')) {
      return { success: false, code: 'AUTH_REQUIRED', data: null };
    }
    await this.waitForConfiguredProfileSelectors();

    const data = await this.page.evaluate((sel) => {
      /** @param {string} [q] */
      const text = (q) =>
        document.querySelector(/** @type {string} */ (q))?.textContent?.trim() || '';
      return {
        name: text(sel.name),
        headline: text(sel.headline),
        personal: {
          name: text(sel.name),
          email: text(sel.email),
          phone: text(sel.phone),
        },
        education: {
          school: text(sel.school),
          major: text(sel.major),
        },
        skills: Array.from(document.querySelectorAll(/** @type {string} */ (sel.skills)))
          .map((el) => el.textContent?.trim())
          .filter(Boolean),
      };
    }, this.selectors);

    return { success: true, code: 'OK', data };
  }

  /**
   * @param {import('./browser-profile-sync-runner.js').ProfileSyncSourceData} sourceData
   * @param {Record<string, unknown>} [options]
   */
  async syncProfile(sourceData, options = {}) {
    return executeProfileSync(this, sourceData, options);
  }

  /**
   * @param {unknown} personal
   */
  async fillPersonalInfo(personal) {
    return fillPersonalInfo.call(
      /** @type {import('./browser-profile-form.js').BrowserProfileSyncContext} */ (this),
      /** @type {{ name?: string, email?: string, phone?: string }} */ (personal)
    );
  }

  async waitForConfiguredProfileSelectors() {
    return waitForConfiguredProfileSelectors.call(
      /** @type {import('./browser-profile-form.js').BrowserProfileSyncContext} */ (this)
    );
  }

  async waitForConfiguredEditSelectors() {
    return waitForConfiguredEditSelectors.call(
      /** @type {import('./browser-profile-form.js').BrowserProfileSyncContext} */ (this)
    );
  }

  /**
   * @param {Array<string | undefined | null>} selectors
   */
  async waitForAnyConfiguredSelector(selectors) {
    return waitForAnyConfiguredSelector.call(
      /** @type {import('./browser-profile-form.js').BrowserProfileSyncContext} */ (this),
      selectors
    );
  }

  /**
   * @param {unknown} careers
   */
  async fillCareers(careers) {
    return fillCareers.call(
      /** @type {import('./browser-profile-form.js').BrowserProfileSyncContext} */ (this),
      careers
    );
  }

  /**
   * @param {unknown} education
   */
  async fillEducation(education) {
    return fillEducation.call(
      /** @type {import('./browser-profile-form.js').BrowserProfileSyncContext} */ (this),
      /** @type {{ school: string, major: string, status?: string } | null | undefined} */ (
        education
      )
    );
  }

  /**
   * @param {unknown} certifications
   */
  async fillCertifications(certifications) {
    return fillCertifications.call(
      /** @type {import('./browser-profile-form.js').BrowserProfileSyncContext} */ (this),
      certifications
    );
  }

  async saveProfile() {
    return saveProfile.call(
      /** @type {import('./browser-profile-form.js').BrowserProfileSyncContext} */ (this)
    );
  }
}

export default BrowserProfileSync;

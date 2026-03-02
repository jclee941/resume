/**
 * Browser-based Platform Handler
 *
 * Base class for platforms that require browser automation (Playwright).
 * Subclasses override extractProfile() for platform-specific extraction.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { CONFIG, PLATFORMS } from './constants.js';
import { log, computeDiff } from './utils.js';

/**
 * Base handler for browser-automated platform syncs
 */
export default class BrowserHandler {
  /**
   * @param {string} platformKey - Platform identifier ('jobkorea' | 'saramin')
   */
  constructor(platformKey) {
    this.platformKey = platformKey;
    this.config = PLATFORMS[platformKey];
  }

  /**
   * Extract current profile data from platform page.
   * Override in subclasses for platform-specific extraction.
   * @param {import('playwright').Page} page - Playwright page
   * @returns {Promise<Object|null>} Profile data or null if failed
   */
  async extractProfile(_page) {
    throw new Error(`extractProfile() must be overridden by ${this.platformKey} handler`);
  }

  /**
   * Get current profile from the platform
   * @param {import('playwright').Page} page - Playwright page
   * @returns {Promise<Object|null>} Profile data or null
   */
  async getCurrentProfile(page) {
    try {
      await page.goto(this.config.profileUrl, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(2000);

      const url = page.url();
      if (url.includes('login') || url.includes('auth')) {
        log('Not logged in - session expired', 'error', this.platformKey);
        return null;
      }

      const profile = await this.extractProfile(page);
      log(`Current profile: ${JSON.stringify(profile)}`, 'info', this.platformKey);
      return profile;
    } catch (error) {
      log(`Failed to get profile: ${error.message}`, 'error', this.platformKey);
      return null;
    }
  }

  /**
   * Apply field changes to the platform edit page
   * @param {import('playwright').Page} page - Playwright page
   * @param {Array<{field: string, from: string, to: string}>} changes - Changes to apply
   * @returns {Promise<boolean>} Whether changes were saved
   */
  async applyChanges(page, changes) {
    if (changes.length === 0) {
      log('No changes to apply', 'success', this.platformKey);
      return true;
    }

    try {
      await page.goto(this.config.editUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      for (const change of changes) {
        log(`Applying: ${change.field} = ${change.to}`, 'info', this.platformKey);

        const selector = this.config.selectors[change.field];
        if (!selector) {
          log(`No selector for field: ${change.field}`, 'warn', this.platformKey);
          continue;
        }

        const element = await page.$(selector);
        if (!element) {
          log(`Element not found: ${selector}`, 'warn', this.platformKey);
          continue;
        }

        await element.click({ clickCount: 3 });
        await element.fill(change.to);
        await page.waitForTimeout(500);
      }

      const saveButton = await page.$(
        'button[type="submit"], .btn-save, .save-btn, [data-testid="save"]'
      );
      if (saveButton) {
        await saveButton.click();
        await page.waitForTimeout(3000);
        log('Changes saved', 'success', this.platformKey);
      } else {
        log('Save button not found - changes may not be saved', 'warn', this.platformKey);
      }

      return true;
    } catch (error) {
      log(`Failed to apply changes: ${error.message}`, 'error', this.platformKey);
      return false;
    }
  }

  /**
   * Sync SSOT data to this platform via browser automation
   * @param {Object} ssot - Resume data from SSOT
   * @returns {Object} Result with {success, changes, dryRun?}
   */
  async sync(ssot) {
    const userDataDir = path.join(CONFIG.USER_DATA_DIR, this.platformKey);
    if (!fs.existsSync(userDataDir)) {
      log(
        `No saved session - run auth-persistent.js ${this.platformKey} first`,
        'error',
        this.platformKey
      );
      return { success: false, changes: [] };
    }

    log(`Starting sync for ${this.config.name}`, 'info', this.platformKey);

    const browser = await chromium.launchPersistentContext(userDataDir, {
      headless: CONFIG.HEADLESS,
      viewport: { width: 1280, height: 800 },
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const page = browser.pages()[0] || (await browser.newPage());

    try {
      const current = await this.getCurrentProfile(page);
      if (!current) {
        await browser.close();
        return { success: false, changes: [] };
      }

      const target = this.config.mapData(ssot);
      const changes = computeDiff(current, target);

      if (changes.length === 0) {
        log('Profile is up to date', 'success', this.platformKey);
        await browser.close();
        return { success: true, changes: [] };
      }

      log(`Found ${changes.length} change(s):`, 'diff', this.platformKey);
      for (const change of changes) {
        console.log(`  ${change.field}: "${change.from}" -> "${change.to}"`);
      }

      if (CONFIG.APPLY && !CONFIG.DIFF_ONLY) {
        const applied = await this.applyChanges(page, changes);
        await browser.close();
        return { success: applied, changes };
      }

      await browser.close();
      return { success: true, changes, dryRun: true };
    } catch (error) {
      log(`Sync failed: ${error.message}`, 'error', this.platformKey);
      await browser.close();
      return { success: false, changes: [], error: error.message };
    }
  }
}

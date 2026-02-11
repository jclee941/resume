/**
 * JobKorea Platform Handler
 *
 * Browser-based sync for jobkorea.co.kr.
 * Extends BrowserHandler with JobKorea-specific profile extraction.
 */

import BrowserHandler from './browser-handler.js';

/**
 * JobKorea platform sync handler
 */
export default class JobKoreaHandler extends BrowserHandler {
  constructor() {
    super('jobkorea');
  }

  /**
   * Extract current profile data from JobKorea page
   * @param {import('playwright').Page} page - Playwright page
   * @returns {Promise<Object>} Profile data with name and headline
   */
  async extractProfile(page) {
    const profileData = await page.evaluate(() => {
      const nameEl = document.querySelector('.user-name, .resume-name');
      const titleEl = document.querySelector('.resume-title, .self-intro');
      return {
        name: nameEl?.textContent?.trim() || '',
        headline: titleEl?.textContent?.trim() || '',
      };
    });

    return {
      name: profileData.name,
      headline: profileData.headline,
    };
  }
}

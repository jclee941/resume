/**
 * Saramin Platform Handler
 *
 * Browser-based sync for saramin.co.kr.
 * Extends BrowserHandler with Saramin-specific profile extraction.
 */

import BrowserHandler from './browser-handler.js';

/**
 * Saramin platform sync handler
 */
export default class SaraminHandler extends BrowserHandler {
  constructor() {
    super('saramin');
  }

  /**
   * Extract current profile data from Saramin page
   * @param {import('playwright').Page} page - Playwright page
   * @returns {Promise<Object>} Profile data with name and headline
   */
  async extractProfile(page) {
    const profileData = await page.evaluate(() => {
      const nameEl = document.querySelector('.user_name, .name');
      const titleEl = document.querySelector('.intro_txt, .self-intro');
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

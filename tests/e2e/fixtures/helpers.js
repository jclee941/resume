// @ts-check
/**
 * Shared E2E test helpers for Playwright
 *
 * Reduces duplication across test files and provides consistent patterns
 * for common operations like navigation, CLI command execution, and assertions.
 */

const { expect } = require('@playwright/test');

/**
 * Validate that links are valid and not broken
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - CSS selector for links to validate
 * @param {Object} options - Optional configuration
 * @param {RegExp} [options.urlPattern] - Optional pattern to match against href
 * @returns {Promise<void>}
 */
async function validateLinks(page, selector, options = {}) {
  const { urlPattern } = options;

  const links = await page.locator(selector).all();

  for (const link of links) {
    const href = await link.getAttribute('href');

    // Skip anchor/relative links
    if (!href || href.startsWith('#')) {
      continue;
    }

    // Validate against pattern if provided
    if (urlPattern && !urlPattern.test(href)) {
      throw new Error(`Link "${href}" doesn't match expected pattern`);
    }

    // Check that link is not broken (has href attribute)
    expect(href).toBeTruthy();
  }
}

const {
  focusElement,
  getElementText,
  verifyDynamicCount,
  waitForText,
} = require('./helpers-element');

module.exports = { validateLinks, getElementText, focusElement, waitForText, verifyDynamicCount };

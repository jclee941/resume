const { expect } = require('@playwright/test');

/**
 * Get all visible text content from an element
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @returns {Promise<string|null>}
 */
async function getElementText(page, selector) {
  const element = page.locator(selector);
  return await element.textContent();
}

/**
 * Focus on an element and verify focus state
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @returns {Promise<void>}
 */
async function focusElement(page, selector) {
  const element = page.locator(selector);
  await element.focus();
  await expect(element).toBeFocused();
}

/**
 * Wait for element to have specific text content
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @param {string|RegExp} text - Text or regex to match
 * @param {Object} options - Optional configuration
 * @param {number} [options.timeout=3000] - Wait timeout (ms)
 * @returns {Promise<void>}
 */
async function waitForText(page, selector, text, options = {}) {
  const { timeout = 3000 } = options;

  const element = page.locator(selector);
  await expect(element).toContainText(text, { timeout });
}

/**
 * Verify that a dynamic count matches expected data
 * Used for validating that project/resume counts match source data
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - CSS selector for count element
 * @param {number} expectedCount - Expected count
 * @returns {Promise<void>}
 */
async function verifyDynamicCount(page, selector, expectedCount) {
  const countText = await page.locator(selector).textContent();
  const count = parseInt(countText || '0', 10);

  expect(count).toBe(expectedCount);
}

module.exports = { focusElement, getElementText, verifyDynamicCount, waitForText };

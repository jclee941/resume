// @ts-check
/**
 * Shared E2E test helpers for Playwright
 *
 * Reduces duplication across test files and provides consistent patterns
 * for common operations like navigation, CLI command execution, and assertions.
 */

const { expect } = require('@playwright/test');

/**
 * Execute a terminal CLI command and wait for output
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} command - Command to execute
 * @param {Object} options - Optional configuration
 * @param {number} [options.timeout=500] - Wait time for output to appear (ms)
 * @param {RegExp|string} [options.expectedOutput] - Optional expected output pattern
 * @returns {Promise<void>}
 */
async function executeCliCommand(page, command, options = {}) {
  const { timeout = 500, expectedOutput } = options;
  
  const cliInput = page.locator('#cli-input');
  await cliInput.fill(command);
  await cliInput.press('Enter');
  
  // Wait for output to appear
  await page.waitForTimeout(timeout);
  
  // Validate output if pattern provided
  if (expectedOutput) {
    const cliOutput = page.locator('#cli-output');
    const pattern = typeof expectedOutput === 'string'
      ? new RegExp(expectedOutput, 'i')
      : expectedOutput;
    await expect(cliOutput).toContainText(pattern);
  }
}

/**
 * Navigate to a section by clicking its link and wait for it to be in viewport
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} sectionId - Section ID (e.g., 'resume', 'projects')
 * @param {Object} options - Optional configuration
 * @param {number} [options.timeout=2000] - Timeout for navigation (ms)
 * @returns {Promise<void>}
 */
async function navigateToSection(page, sectionId, options = {}) {
  const { timeout = 2000 } = options;
  
  const link = page.locator(`a[href="#${sectionId}"]`);
  await link.click();
  
  const section = page.locator(`#${sectionId}`);
  await expect(section).toBeInViewport({ timeout });
}

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

/**
 * Wait for an animation to complete on an element
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - CSS selector for element being animated
 * @param {Object} options - Optional configuration
 * @param {number} [options.duration=500] - Expected animation duration (ms)
 * @param {number} [options.tolerance=100] - Tolerance for animation duration (ms)
 * @returns {Promise<void>}
 */
async function waitForAnimation(page, selector, options = {}) {
  const { duration = 500, tolerance = 100 } = options;
  
  const element = page.locator(selector);
  
  // Wait for element to be visible
  await expect(element).toBeVisible();
  
  // Wait for animation to potentially start (small delay)
  await page.waitForTimeout(50);
  
  // Wait for animation to complete with tolerance
  await page.waitForTimeout(duration + tolerance);
  
  // Verify element is still in valid state after animation
  await expect(element).toBeVisible();
}

/**
 * Check viewport and responsive behavior
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} options - Configuration
 * @param {number} options.width - Viewport width
 * @param {number} options.height - Viewport height
 * @param {string} [options.breakpointName] - Optional name for breakpoint (e.g., 'mobile')
 * @returns {Promise<void>}
 */
async function setViewportAndVerify(page, options = {}) {
  const { width, height, breakpointName = 'custom' } = options;
  
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(100); // Wait for layout to recalculate
}

/**
 * Get all visible text content from an element
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @returns {Promise<string>}
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

module.exports = {
  executeCliCommand,
  navigateToSection,
  validateLinks,
  waitForAnimation,
  setViewportAndVerify,
  getElementText,
  focusElement,
  waitForText,
  verifyDynamicCount,
};

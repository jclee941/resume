// @ts-check
const { test, expect } = require('@playwright/test');
const {
  SELECTORS,
  REGEX_PATTERNS,
  navigateToHome,
  checkElementVisible,
} = require('./portfolio-test-helpers.js');

test.describe('Portfolio Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToHome(page);
  });

  test('should load successfully', async ({ page }) => {
    await expect(page).toHaveTitle(REGEX_PATTERNS.TITLE);
  });

  test('should display hero section', async ({ page }) => {
    await checkElementVisible(page, SELECTORS.HERO_TITLE);
    await expect(page.locator(SELECTORS.HERO_TITLE)).toContainText(/Jaecheol Lee|이재철/);
  });

  test('should have working scroll to sections', async ({ page }) => {
    // Test navigation to projects section
    await page.click('a[href="#projects"]');
    await page.waitForTimeout(500); // Allow scroll animation
    const projectsSection = page.locator('#projects');
    await expect(projectsSection).toBeVisible();
  });
});

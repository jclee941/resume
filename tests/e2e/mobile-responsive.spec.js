// @ts-check
const { test, expect } = require('@playwright/test');

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const HERO_NAME_PATTERN = /Jaecheol Lee|이재철/;

/**
 * Mobile Responsive E2E Tests
 *
 * Tests the responsive design across different mobile devices.
 * Configured to run on mobile projects in playwright.config.js:
 * - mobile-iphone-se
 * - mobile-iphone-12
 * - mobile-pixel
 * - mobile-ipad
 *
 * File naming: mobile.spec.js matches testMatch in config.
 */

test.describe('Mobile - Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should keep clean main content within the mobile viewport', async ({ page }) => {
    const mainContent = page.locator('main#main-content');
    await expect(mainContent).toBeAttached();

    const viewportSize = page.viewportSize();
    const mainBox = await mainContent.boundingBox();

    if (viewportSize && mainBox) {
      expect(mainBox.width).toBeLessThanOrEqual(viewportSize.width);
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
    await expect(page.locator('.terminal-window')).toHaveCount(0);
  });

  test('should display hero section correctly on mobile', async ({ page }) => {
    const hero = page.locator('#hero');
    await expect(hero).toBeVisible();

    const heroTitle = page.locator('.hero-title');
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toContainText(HERO_NAME_PATTERN);
  });

  test('should have readable text on mobile', async ({ page }) => {
    // Check that main content text is visible
    const aboutSection = page.locator('#about');
    await expect(aboutSection).toBeVisible();

    // About content should have readable text
    const aboutContent = page.locator('.about-content');
    await expect(aboutContent).toBeVisible();
  });
});

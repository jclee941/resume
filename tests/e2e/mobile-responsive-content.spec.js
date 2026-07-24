// @ts-check
const { test, expect } = require('@playwright/test');

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe('Mobile - Removed CLI', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should not render CLI container, input, or output on mobile', async ({ page }) => {
    await expect(page.locator('#cli-container')).toHaveCount(0);
    await expect(page.locator('#terminal-input')).toHaveCount(0);
    await expect(page.locator('#cli-output')).toHaveCount(0);
  });

  test('should keep primary contact and resume download CTAs reachable on mobile', async ({
    page,
  }) => {
    const contactLink = page.locator('a[href^="mailto:"]').first();
    await expect(contactLink).toBeVisible();

    const resumePdfLink = page.locator('a[href="/resume.pdf"], a[href$="resume.pdf"]').first();
    await expect(resumePdfLink).toBeVisible();
  });
});

test.describe('Mobile - Sections Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should display all main sections on mobile', async ({ page }) => {
    const sections = [
      '#hero',
      '#about',
      '#cover-letter',
      '#resume',
      '#certifications',
      '#projects',
      '#skills',
      '#operated',
      '#contact',
    ];

    for (const selector of sections) {
      const section = page.locator(selector);
      await expect(section).toBeAttached();
    }
  });

  test('should display footer on mobile', async ({ page }) => {
    const footer = page.locator('.site-footer');
    await expect(footer).toBeAttached();
  });
});

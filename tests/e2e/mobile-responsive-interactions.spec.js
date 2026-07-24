// @ts-check
const { test, expect } = require('@playwright/test');

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe('Mobile - Touch Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should support touch scrolling', async ({ page }) => {
    const initialScroll = await page.evaluate(() => window.scrollY);

    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(100);

    const newScroll = await page.evaluate(() => window.scrollY);
    expect(newScroll).toBeGreaterThan(initialScroll);
  });

  test('should support clicking navigation links', async ({ page }) => {
    await page.locator('.nav-toggle').click();
    await expect(page.locator('.nav-links')).toHaveClass(/open/);
    const aboutLink = page.locator('.nav-links a[href="#about"]');
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();
    
    await page.waitForTimeout(600);
    const aboutInView = await page.evaluate(() => {
      const about = document.getElementById('about');
      if (!about) return false;
      const r = about.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    expect(aboutInView).toBe(true);
  });
});

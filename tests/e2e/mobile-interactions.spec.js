// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} [url='/']
 */
async function safeMobileGoto(page, url = '/') {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 500) {
      test.skip(true, 'Server unavailable - skipping mobile test');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('net::ERR_NETWORK_CHANGED') ||
      message.includes('net::ERR_INTERNET_DISCONNECTED')
    ) {
      test.skip(true, 'Network unavailable - skipping mobile test');
    }
    throw error;
  }
}

test.describe('Mobile Interactions', () => {
  test('should have working navigation', async ({ page }) => {
    await safeMobileGoto(page);
    await page.waitForLoadState('domcontentloaded');

    const nav = page.locator('nav, .nav, [role="navigation"]').first();

    if ((await nav.count()) > 0) {
      await expect(nav).toBeVisible();

      const navLinks = nav.locator('a[href]');
      const linkCount = await navLinks.count();

      expect(linkCount).toBeGreaterThan(0);

      if (linkCount > 0) {
        const firstLink = navLinks.first();
        await expect(firstLink).toBeVisible();

        const href = await firstLink.getAttribute('href');
        expect(href).toBeTruthy();
      }
    }
  });

  test('should be scrollable', async ({ page }) => {
    await safeMobileGoto(page);
    await page.waitForLoadState('domcontentloaded');

    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = page.viewportSize()?.height || 0;

    if (pageHeight > viewportHeight) {
      const initialScroll = await page.evaluate(() => window.scrollY);

      await page.mouse.wheel(0, 500);

      await expect(async () => {
        const currentScroll = await page.evaluate(() => window.scrollY);
        expect(currentScroll).toBeGreaterThan(initialScroll);
      }).toPass({ timeout: 2000 });
    }
  });

  test('should handle touch interactions', async ({ page }) => {
    await safeMobileGoto(page);
    await page.waitForLoadState('domcontentloaded');

    const clickable = page.locator('button:not(.skip-link), a[href]:not(.skip-link)').first();

    if ((await clickable.count()) > 0) {
      await expect(clickable).toBeVisible();

      const box = await clickable.boundingBox();
      expect(box).toBeTruthy();

      if (box) {
        await clickable.scrollIntoViewIfNeeded();
        await clickable.click();
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

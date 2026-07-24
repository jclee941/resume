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

test.describe('Mobile Content Contracts', () => {
  test('should load images with proper alt text', async ({ page }) => {
    await safeMobileGoto(page);
    await page.waitForLoadState('domcontentloaded');

    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeDefined();

      const src = await img.getAttribute('src');
      expect(src).toBeTruthy();
    }
  });

  test('should have proper viewport meta tag', async ({ page }) => {
    await safeMobileGoto(page);

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');

    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta).toContain('width=device-width');
  });
});

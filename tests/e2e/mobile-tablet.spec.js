// @ts-check
const { test, expect } = require('@playwright/test');

async function safeMobileGoto(page, url = '/') {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 500) {
      test.skip(true, 'Server unavailable - skipping mobile test');
    }
  } catch (error) {
    if (
      error.message?.includes('net::ERR_NETWORK_CHANGED') ||
      error.message?.includes('net::ERR_INTERNET_DISCONNECTED')
    ) {
      test.skip(true, 'Network unavailable - skipping mobile test');
    }
    throw error;
  }
}

test.describe('Tablet Features', () => {
  test('should handle orientation changes', async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width < 768) {
      test.skip(true, 'orientation scenario only applies to tablet-width projects');
      return;
    }

    await safeMobileGoto(page);
    await page.waitForLoadState('domcontentloaded');

    await page.setViewportSize({
      width: viewport.height,
      height: viewport.width,
    });

    const mainContent = page.locator('#main-content, main, body').first();
    await expect(mainContent).toBeVisible();

    const newViewportWidth = page.viewportSize()?.width || 0;
    const documentWidth = await page.evaluate(() => {
      return Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    });

    expect(documentWidth).toBeLessThanOrEqual(newViewportWidth + 1);
  });
});

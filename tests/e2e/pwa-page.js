const { test, expect } = require('@playwright/test');

test.describe('Progressive Web App (PWA)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should have manifest.json link', async ({ page }) => {
    const manifestLink = page.locator('link[rel="manifest"]');
    const href = await manifestLink.getAttribute('href');
    expect(href).toMatch(/^\/manifest(_en)?\.json$/);
  });

  test('should have PWA meta tags', async ({ page }) => {
    // Theme color
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#0c0c12');

    // Apple mobile web app
    const appleCapable = page.locator('meta[name="apple-mobile-web-app-capable"]');
    if ((await appleCapable.count()) > 0) {
      await expect(appleCapable).toHaveAttribute('content', 'yes');
    }

    const appleTitle = page.locator('meta[name="apple-mobile-web-app-title"]');
    await expect(appleTitle).toHaveAttribute('content', 'JC Lee Resume');
  });
});

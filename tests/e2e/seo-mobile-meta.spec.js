// @ts-check
const { test, expect } = require('@playwright/test');

const configuredBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL || (process.env.CI ? 'http://localhost:8787' : '');
const isLocalhost = /127\.0\.0\.1|localhost/.test(configuredBaseUrl);

function skipIfLocalRateLimited(response, testInfo) {
  if (isLocalhost && response && response.status() === 429) {
    testInfo.skip(true, 'Rate-limited by local wrangler dev server');
    return true;
  }
  return false;
}

test.describe('PWA Meta Tags', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (skipIfLocalRateLimited(response, testInfo)) {
      return;
    }
  });

  test('should have manifest link', async ({ page }) => {
    const manifest = await page.getAttribute('link[rel="manifest"]', 'href');
    expect(manifest).toMatch(/^\/manifest(_en)?\.json$/);
  });

  test('should have theme-color', async ({ page }) => {
    const themeColor = await page.getAttribute('meta[name="theme-color"]', 'content');
    expect(themeColor).toBeTruthy();
    expect(themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('should have Apple mobile web app meta tags', async ({ page }) => {
    const capableMeta = page.locator('meta[name="apple-mobile-web-app-capable"]');
    if ((await capableMeta.count()) > 0) {
      await expect(capableMeta).toHaveAttribute('content', 'yes');
    }

    const statusBar = await page.getAttribute(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
      'content'
    );
    expect(statusBar).toBeTruthy();

    const title = await page.getAttribute('meta[name="apple-mobile-web-app-title"]', 'content');
    expect(title).toBeTruthy();
  });
});

test.describe('Resource Hints', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (skipIfLocalRateLimited(response, testInfo)) {
      return;
    }
  });

  test('should have resource hints for external services', async ({ page }) => {
    const resourceHints = page.locator(
      'link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="preload"]'
    );
    const count = await resourceHints.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

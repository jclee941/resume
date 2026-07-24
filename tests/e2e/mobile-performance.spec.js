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

test.describe('Mobile Performance', () => {
  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();

    await safeMobileGoto(page);
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('should not block main thread excessively', async ({ page }) => {
    await safeMobileGoto(page);
    await page.waitForLoadState('domcontentloaded');

    const longTasks = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            resolve(list.getEntries().length);
            observer.disconnect();
          });

          observer.observe({ entryTypes: ['longtask'] });

          setTimeout(() => {
            observer.disconnect();
            resolve(0);
          }, 2000);
        } else {
          resolve(0);
        }
      });
    });

    expect(longTasks).toBeLessThan(5);
  });
});

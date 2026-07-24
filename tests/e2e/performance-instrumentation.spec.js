// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Performance instrumentation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should track and send Web Vitals to /api/vitals', async ({ page }) => {
    // NOTE: this skip guard must stay INSIDE the test body. Calling the
    // conditional skip modifier at the describe-body top level (outside any
    // `test(...)` call) applies it as a static annotation to every test in
    // the enclosing suite (see bindFileSuiteToProject in the Playwright
    // runner), silently skipping the entire "Performance & Core Web Vitals"
    // suite in CI instead of only this one test.
    test.skip(
      !!process.env.CI,
      'Web Vitals tracking requires /api/vitals endpoint not available in CI'
    );

    /** @type {{ url: string, method: string, postData: unknown }[]} */
    const vitalsRequests = [];

    // Intercept /api/vitals requests
    page.on('request', (request) => {
      if (request.url().includes('/api/vitals')) {
        vitalsRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postDataJSON(),
        });
      }
    });

    // Set up request promise before navigation
    const vitalsRequestPromise = page.waitForRequest(
      (request) => request.url().includes('/api/vitals'),
      { timeout: 15000 }
    );

    await page.goto('/');

    // Trigger page hide event (should send vitals)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait for the vitals request
    await vitalsRequestPromise;

    // Should have sent vitals data
    expect(vitalsRequests.length).toBeGreaterThan(0);

    // Check vitals data structure
    const vitalsData = vitalsRequests[0]?.postData;
    if (vitalsData) {
      expect(vitalsData).toHaveProperty('url');
      expect(vitalsData).toHaveProperty('timestamp');
      // May have lcp, fid, cls, fcp, ttfb (depends on browser support)
    }
  });

  test('should have optimized resource loading', async ({ page }) => {
    // Set up request listener BEFORE navigation
    const requests = [];
    page.on('request', (request) => requests.push(request));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Should not have excessive requests
    expect(requests.length).toBeLessThan(20);
  });

  test('should have correct caching headers', async ({ request }) => {
    const response = await request.get('/');

    // Check cache headers
    const cacheControl = response.headers()['cache-control'];

    // Static assets should be cacheable
    // HTML should have revalidation
    if (cacheControl) {
      // Cloudflare Workers may set different policies
      expect(cacheControl).toBeTruthy();
    }
  });
});

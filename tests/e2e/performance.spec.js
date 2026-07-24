// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Performance & Core Web Vitals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  // LCP test can be flaky due to network conditions and parallel test execution
  test(
    'should have good Largest Contentful Paint (LCP)',
    /** @type {Parameters<typeof test>[1] & { retries: number }} */ ({ retries: 2 }),
    async ({ page }) => {
      await page.goto('/');

    // Wait for LCP to be measured
    await page.waitForLoadState('load');
    await page.waitForFunction(
      () => {
        const navigationEntry = performance.getEntriesByType('navigation')[0];

        const navigationLoadEventEnd =
          navigationEntry === undefined
            ? 0
            : (/** @type {PerformanceNavigationTiming} */ (navigationEntry)).loadEventEnd;

        return performance.getEntriesByType('largest-contentful-paint').length > 0 || navigationLoadEventEnd > 0;
      },
      { timeout: 5000 }
    );

    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Check for existing LCP entries first (buffered)
        const existingEntries = performance.getEntriesByType('largest-contentful-paint');
        if (existingEntries.length > 0) {
          /** @type {PerformanceEntry & { renderTime?: number, loadTime?: number }} */
          const lastEntry = existingEntries[existingEntries.length - 1];
          resolve(lastEntry.renderTime || lastEntry.loadTime);
          return;
        }

        // If no buffered entries, observe for new ones with timeout
        let resolved = false;
        const observer = new PerformanceObserver((list) => {
          if (resolved) return;
          const entries = list.getEntries();
          if (entries.length > 0) {
            /** @type {PerformanceEntry & { renderTime?: number, loadTime?: number }} */
            const lastEntry = entries[entries.length - 1];
            resolved = true;
            resolve(lastEntry.renderTime || lastEntry.loadTime);
          }
        });
        observer.observe({
          type: 'largest-contentful-paint',
          buffered: true,
        });

        // Timeout fallback - use navigation timing as approximation
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            const nav = /** @type {PerformanceNavigationTiming | undefined} */ (
              performance.getEntriesByType('navigation')[0]
            );
            // Use load event end as fallback LCP approximation
            resolve(nav ? nav.loadEventEnd - nav.startTime : 0);
          }
        }, 5000);
      });
    });

    // LCP should be under 2.5 seconds (Google's "Good" threshold)
    expect(lcp).toBeLessThan(2500);
  });

  test('should have low Cumulative Layout Shift (CLS)', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load and settle
    await page.waitForLoadState('load');

    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const rawEntry of list.getEntries()) {
            /** @type {PerformanceEntry & { hadRecentInput?: boolean, value?: number }} */
            const entry = rawEntry;
            if (!entry.hadRecentInput) {
              clsValue += entry.value || 0;
            }
          }
          resolve(clsValue);
        }).observe({ type: 'layout-shift', buffered: true });

        // Settle after 2 seconds
        setTimeout(() => resolve(clsValue), 2000);
      });
    });

    // CLS should be under 0.1 (Google's "Good" threshold)
    expect(cls).toBeLessThan(0.1);
  });

  // FCP test - uses direct Performance Timeline API for reliability
  test('should have fast First Contentful Paint (FCP)', async ({ page }) => {
    // Navigate and wait for full load
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for paint metrics to be recorded
    await page.waitForFunction(() => performance.getEntriesByType('paint').length > 0, {
      timeout: 5000,
    });

    const metrics = await page.evaluate(() => {
      // Direct access to paint entries via Performance Timeline API
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');

      // Get navigation timing as fallback
      const navEntry = /** @type {PerformanceNavigationTiming | undefined} */ (
        performance.getEntriesByType('navigation')[0]
      );

      return {
        fcp: fcpEntry ? fcpEntry.startTime : null,
        domInteractive: navEntry ? navEntry.domInteractive : null,
        domContentLoaded: navEntry ? navEntry.domContentLoadedEventEnd : null,
        loadEventEnd: navEntry ? navEntry.loadEventEnd : null,
        paintEntryCount: paintEntries.length,
      };
    });

    // Use FCP if available, otherwise fall back to domContentLoaded timing
    const fcpValue = metrics.fcp || metrics.domContentLoaded || metrics.domInteractive || 0;

    // Log metrics for debugging
    if (!metrics.fcp) {
      console.log('FCP metric not available, using fallback:', {
        domInteractive: metrics.domInteractive,
        domContentLoaded: metrics.domContentLoaded,
        paintEntryCount: metrics.paintEntryCount,
      });
    }

    // FCP should be under 1.8 seconds (Google's "Good" threshold)
    expect(fcpValue).toBeLessThan(1800);
  });

  test('should have fast Time to First Byte (TTFB)', async ({ page }) => {
    await page.goto('/');

    const ttfb = await page.evaluate(() => {
      const navEntry = /** @type {PerformanceNavigationTiming} */ (
        performance.getEntriesByType('navigation')[0]
      );
      return navEntry.responseStart - navEntry.requestStart;
    });

    // TTFB should be under 800ms (Google's "Good" threshold)
    expect(ttfb).toBeLessThan(800);
  });

});

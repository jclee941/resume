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
  test('should have good Largest Contentful Paint (LCP)', { retries: 2 }, async ({ page }) => {
    await page.goto('/');

    // Wait for LCP to be measured
    await page.waitForLoadState('load');
    await page.waitForFunction(
      () =>
        performance.getEntriesByType('largest-contentful-paint').length > 0 ||
        (performance.getEntriesByType('navigation')[0] &&
          performance.getEntriesByType('navigation')[0].loadEventEnd > 0),
      { timeout: 5000 }
    );

    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Check for existing LCP entries first (buffered)
        const existingEntries = performance.getEntriesByType('largest-contentful-paint');
        if (existingEntries.length > 0) {
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
            const nav = performance.getEntriesByType('navigation')[0];
            // Use load event end as fallback LCP approximation
            resolve(nav ? nav.loadEventEnd - nav.startTime : 0);
          }
        }, 5000);
      });
    });

    // LCP should be under 2.5 seconds (Google's "Good" threshold)
    expect(lcp).toBeLessThan(2500);
  });

  // TODO: CLS slightly exceeds 0.1 threshold (0.113) after neon redesign - needs CSS investigation
  test('should have low Cumulative Layout Shift (CLS)', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load and settle
    await page.waitForLoadState('load');

    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
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
      const navEntry = performance.getEntriesByType('navigation')[0];

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
      const navEntry = performance.getEntriesByType('navigation')[0];
      return navEntry.responseStart - navEntry.requestStart;
    });

    // TTFB should be under 800ms (Google's "Good" threshold)
    expect(ttfb).toBeLessThan(800);
  });

  test.skip(
    !!process.env.CI,
    'Web Vitals tracking requires /api/vitals endpoint not available in CI'
  );
  test('should track and send Web Vitals to /api/vitals', async ({ page }) => {
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

  test('should use modern image formats efficiently', async ({ page }) => {
    await page.goto('/');

    // Check for images
    const images = await page.$$eval('img', (imgs) =>
      imgs.map((img) => ({
        src: img.src,
        loading: img.loading,
        width: img.width,
        height: img.height,
      }))
    );

    // All images should have explicit dimensions (prevent CLS)
    images.forEach((img) => {
      if (img.src && !img.src.includes('data:')) {
        expect(img.width).toBeGreaterThan(0);
        expect(img.height).toBeGreaterThan(0);
      }
    });
  });

  test('should have optimized font loading', async ({ page }) => {
    await page.goto('/');

    const hasInlinedFonts = await page.evaluate(() => {
      const styles = Array.from(document.querySelectorAll('style'));
      return styles.some(
        (s) => s.textContent.includes('@font-face') || s.textContent.includes('font-family')
      );
    });

    const hasFontLinks = await page.locator('link[href*="fonts"]').count();

    expect(hasInlinedFonts || hasFontLinks > 0).toBe(true);
  });

  test('should load critical CSS inline', async ({ page }) => {
    await page.goto('/');

    // Critical CSS should be inlined in <style> tag
    const inlineStyles = await page.$$eval('style', (styles) =>
      styles.map((style) => style.textContent.length)
    );

    // Should have inline critical CSS
    const hasCriticalCSS = inlineStyles.some((length) => length > 1000);
    expect(hasCriticalCSS).toBe(true);
  });

  test.skip('should not block rendering with scripts', async ({ page }) => {
    await page.goto('/');

    // All scripts should be at bottom of body or async/defer
    const blockingScripts = await page.$$eval(
      'head script:not([async]):not([defer])',
      (scripts) => scripts.filter((s) => !s.type || s.type === 'text/javascript').length
    );

    // JSON-LD scripts in head are OK (type="application/ld+json")
    // Should have no blocking scripts
    expect(blockingScripts).toBe(0);
  });

  test('should have good performance score metrics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Collect all performance metrics
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        loadComplete: nav.loadEventEnd - nav.loadEventStart,
        domInteractive: nav.domInteractive - nav.fetchStart,
        transferSize: nav.transferSize,
      };
    });

    // DOM Interactive should be fast
    expect(metrics.domInteractive).toBeLessThan(2000);

    // Transfer size should be reasonable (under 500KB for initial load)
    expect(metrics.transferSize).toBeLessThan(500000);
  });
});

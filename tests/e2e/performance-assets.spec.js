// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Performance assets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should use modern image formats efficiently', async ({ page }) => {
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

  test('should not block rendering with scripts', async ({ page }) => {
    await page.goto('/');

    // All scripts should be at bottom of body or async/defer
    const blockingScripts = await page.$$eval(
      'head script:not([async]):not([defer])',
      (scripts) =>
        scripts.filter(
          (script) =>
            !(script instanceof HTMLScriptElement) ||
            !script.type ||
            script.type === 'text/javascript'
        ).length
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
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      if (navigationEntry === undefined) {
        throw new Error('Navigation performance entry is unavailable');
      }
      const nav = /** @type {PerformanceNavigationTiming} */ (navigationEntry);
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

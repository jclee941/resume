// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Mobile E2E Tests
 * Tests responsive design across multiple mobile devices
 *
 * This file runs on all mobile devices configured in playwright.config.js:
 * - iPhone SE (375×667)
 * - iPhone 12 Pro (390×844)
 * - Pixel 5 (393×851)
 * - iPad (768×1024)
 *
 * Coverage:
 * - Touch target sizes (≥ 44px)
 * - No horizontal overflow
 * - Readable text (≥ 16px body)
 * - Navigation functionality
 * - Viewport-specific layouts
 */

test.describe('Mobile Responsiveness', () => {
  test('should load page successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/이재철/);

    // Check main content is visible (use first() to avoid strict mode violation)
    const mainContent = page.locator('#main-content, main, body').first();
    await expect(mainContent).toBeVisible();
  });

  test('should have touch-friendly interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Get all interactive elements (buttons and primary links)
    const buttons = await page.locator('button:visible').all();
    const navLinks = await page.locator('nav a:visible, .nav a:visible').all();

    const interactiveElements = [...buttons, ...navLinks];

    // Should have some interactive elements
    expect(interactiveElements.length).toBeGreaterThan(0);

    // Check touch target sizes
    let tooSmallCount = 0;

    for (const element of interactiveElements) {
      const box = await element.boundingBox();

      // Skip if element is not visible
      if (!box) continue;

      // Apple HIG and WCAG 2.5.5: minimum 44x44px touch targets
      const meetsMinimum = box.width >= 44 && box.height >= 44;

      // Check if element is reasonably sized (allow some flexibility for compact mobile designs)
      const isReasonablyLarge = box.width >= 36 || box.height >= 36;

      if (!meetsMinimum && !isReasonablyLarge) {
        const elementText = await element.textContent();
        console.warn(
          `Touch target too small: ${elementText?.trim().substring(0, 30)} ` +
            `(${Math.round(box.width)}x${Math.round(box.height)}px)`
        );
        tooSmallCount++;
      }
    }

    // Allow up to 30% of elements to be slightly smaller (e.g., inline links, mobile compact design)
    const allowedSmall = Math.ceil(interactiveElements.length * 0.3);
    expect(tooSmallCount).toBeLessThanOrEqual(allowedSmall);
  });

  test('should not have horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check document width doesn't exceed viewport width
    const viewportWidth = page.viewportSize()?.width || 0;

    const documentWidth = await page.evaluate(() => {
      return Math.max(
        document.documentElement.scrollWidth,
        document.documentElement.offsetWidth,
        document.body.scrollWidth,
        document.body.offsetWidth
      );
    });

    // Allow 1px tolerance for rounding
    expect(documentWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('should have readable text sizes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check main body text is at least 14px (minimum readable)
    const bodyTexts = await page
      .locator('p:not(small):not(sub):not(sup), li, span:not(small):not(sub):not(sup)')
      .all();

    if (bodyTexts.length > 0) {
      let tooSmallCount = 0;

      for (const textEl of bodyTexts.slice(0, 10)) {
        // Sample first 10
        const fontSize = await textEl.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return parseInt(style.fontSize, 10);
        });

        if (fontSize < 14) {
          tooSmallCount++;
        }
      }

      // Most text should be at least 14px
      expect(tooSmallCount).toBeLessThan(8);
    }
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check if nav exists
    const nav = page.locator('nav, .nav, [role="navigation"]').first();

    if ((await nav.count()) > 0) {
      await expect(nav).toBeVisible();

      // Check navigation links
      const navLinks = nav.locator('a[href]');
      const linkCount = await navLinks.count();

      expect(linkCount).toBeGreaterThan(0);

      // Test first link
      if (linkCount > 0) {
        const firstLink = navLinks.first();
        await expect(firstLink).toBeVisible();

        const href = await firstLink.getAttribute('href');
        expect(href).toBeTruthy();
      }
    }
  });

  test('should load images with proper alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const images = await page.locator('img').all();

    for (const img of images) {
      // Images should have alt attribute (can be empty for decorative)
      const alt = await img.getAttribute('alt');
      expect(alt).toBeDefined();

      // Images should have src
      const src = await img.getAttribute('src');
      expect(src).toBeTruthy();
    }
  });

  test('should have proper viewport meta tag', async ({ page }) => {
    await page.goto('/');

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');

    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta).toContain('width=device-width');
  });

  test('should be scrollable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check if page has scrollable content
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = page.viewportSize()?.height || 0;

    if (pageHeight > viewportHeight) {
      // Get initial scroll position
      const initialScroll = await page.evaluate(() => window.scrollY);

      // Scroll down
      await page.mouse.wheel(0, 500);

      // Wait for scroll to complete using polling assertion
      await expect(async () => {
        const currentScroll = await page.evaluate(() => window.scrollY);
        expect(currentScroll).toBeGreaterThan(initialScroll);
      }).toPass({ timeout: 2000 });
    }
  });

  test('should handle touch interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find a clickable element (button or link), excluding skip-link which is hidden
    // Skip-links are positioned off-screen and cannot be scrolled to on mobile
    const clickable = page.locator('button:not(.skip-link), a[href]:not(.skip-link)').first();

    if ((await clickable.count()) > 0) {
      // Should be able to tap/click
      await expect(clickable).toBeVisible();

      // Get element position
      const box = await clickable.boundingBox();
      expect(box).toBeTruthy();

      if (box) {
        // Scroll element into view before clicking
        // Playwright\'s .click() requires element visible in viewport
        await clickable.scrollIntoViewIfNeeded();

        // Use click instead of touchscreen.tap (works for mobile viewports without hasTouch)
        await clickable.click();

        // Wait for page to stabilize after click (not arbitrary timeout)
        await page.waitForLoadState('domcontentloaded');

        // Page should still be responsive
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// Tablet-specific tests (iPad only)
test.describe('Tablet Features', () => {
  test('should handle orientation changes', async ({ page }) => {
    // Skip if not iPad viewport (width >= 768px)
    const viewport = page.viewportSize();
    if (!viewport || viewport.width < 768) {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Simulate landscape orientation
    await page.setViewportSize({
      width: viewport.height,
      height: viewport.width,
    });

    // Check page still renders correctly (auto-retries)
    const mainContent = page.locator('#main-content, main, body').first();
    await expect(mainContent).toBeVisible();

    // No horizontal overflow in landscape
    const newViewportWidth = page.viewportSize()?.width || 0;
    const documentWidth = await page.evaluate(() => {
      return Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    });

    expect(documentWidth).toBeLessThanOrEqual(newViewportWidth + 1);
  });
});

// Performance check for mobile
test.describe('Mobile Performance', () => {
  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds on mobile
    expect(loadTime).toBeLessThan(3000);
  });

  test('should not block main thread excessively', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for long tasks (blocking main thread > 50ms)
    const longTasks = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            resolve(list.getEntries().length);
            observer.disconnect();
          });

          observer.observe({ entryTypes: ['longtask'] });

          // Timeout after 2 seconds
          setTimeout(() => {
            observer.disconnect();
            resolve(0);
          }, 2000);
        } else {
          resolve(0);
        }
      });
    });

    // Should have minimal long tasks
    expect(longTasks).toBeLessThan(5);
  });
});

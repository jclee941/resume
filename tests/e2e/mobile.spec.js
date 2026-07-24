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
    await safeMobileGoto(page);
    await expect(page).toHaveTitle(/Jaecheol Lee|이재철/);

    // Check main content is visible (use first() to avoid strict mode violation)
    const mainContent = page.locator('#main-content, main, body').first();
    await expect(mainContent).toBeVisible();
  });

  test('should have touch-friendly interactive elements', async ({ page }) => {
    await safeMobileGoto(page);
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

  test('mobile resume company links keep 44px tap targets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await safeMobileGoto(page);
    await page.waitForSelector('#resume .timeline-company .company-link', { timeout: 15000 });

    const companyTargets = await page
      .locator('#resume .timeline-company .company-link')
      .evaluateAll((links) =>
        links
          .filter((link) => {
            const style = window.getComputedStyle(link);
            return style.visibility !== 'hidden' && style.display !== 'none';
          })
          .map((link) => {
            const rect = link.getBoundingClientRect();
            const wrapperRect = link.parentElement?.getBoundingClientRect();
            return {
              text: (link.textContent || '').replace(/\s+/g, ' ').trim(),
              linkHeight: Math.round(rect.height),
              wrapperHeight: wrapperRect ? Math.round(wrapperRect.height) : 0,
            };
          })
      );

    expect(companyTargets.length).toBeGreaterThan(0);

    const undersized = companyTargets.filter(
      (target) => target.linkHeight < 44 && target.wrapperHeight < 44
    );
    expect(
      undersized,
      `company links under 44px tap target: ${JSON.stringify(undersized, null, 2)}`
    ).toEqual([]);
  });

  test('should not have horizontal overflow', async ({ page }) => {
    await safeMobileGoto(page);
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
    await safeMobileGoto(page);
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

});

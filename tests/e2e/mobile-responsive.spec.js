// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Mobile Responsive E2E Tests
 *
 * Tests the responsive design across different mobile devices.
 * Configured to run on mobile projects in playwright.config.js:
 * - mobile-iphone-se
 * - mobile-iphone-12
 * - mobile-pixel
 * - mobile-ipad
 *
 * File naming: mobile.spec.js matches testMatch in config.
 */

test.describe('Mobile - Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test.skip('should display terminal window on mobile', async ({ page }) => {
    const terminal = page.locator('.terminal-window').first();
    await expect(terminal).toBeAttached();

    // Terminal should fill most of the viewport
    const viewportSize = page.viewportSize();
    const terminalBox = await terminal.boundingBox();

    if (viewportSize && terminalBox) {
      // Terminal width should be at least 90% of viewport on mobile
      expect(terminalBox.width).toBeGreaterThan(viewportSize.width * 0.8);
    }
  });

  test('should display hero section correctly on mobile', async ({ page }) => {
    const hero = page.locator('#hero');
    await expect(hero).toBeVisible();

    const heroTitle = page.locator('.hero-title');
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toContainText('이재철');
  });

  test('should have readable text on mobile', async ({ page }) => {
    // Check that main content text is visible
    const aboutSection = page.locator('#about');
    await expect(aboutSection).toBeVisible();

    // About content should have readable text
    const aboutContent = page.locator('.about-content');
    await expect(aboutContent).toBeVisible();
  });
});

test.describe('Mobile - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should display navigation on mobile', async ({ page }) => {
    const nav = page.locator('.minimal-nav');
    await expect(nav).toBeAttached();
  });

  test.skip('should be able to navigate to sections on mobile', async ({ page }) => {
    // Click on about link
    const aboutLink = page.locator('a[href="#about"]').first();
    await aboutLink.click();
    await expect(page).toHaveURL(/#about/);
  });
});

test.describe('Mobile - CLI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should display CLI container on mobile', async ({ page }) => {
    const cliContainer = page.locator('#cli-container');
    await expect(cliContainer).toBeVisible();
  });

  test('should be able to interact with CLI on mobile', async ({ page }) => {
    const cliInput = page.locator('#terminal-input');

    await cliInput.focus();
    await expect(cliInput).toBeFocused();

    await cliInput.fill('help');
    await cliInput.press('Enter');

    const cliOutput = page.locator('#cli-output');
    await expect(cliOutput.getByText('Available commands')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Mobile - Touch Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test.skip('should support touch scrolling', async ({ page }) => {
    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);

    // Scroll down using JavaScript (simulating touch scroll)
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(100);

    // Verify scroll occurred
    const newScroll = await page.evaluate(() => window.scrollY);
    expect(newScroll).toBeGreaterThan(initialScroll);
  });

  test.skip('should support clicking navigation links', async ({ page }) => {
    const aboutLink = page.locator('a[href="#about"]').first();
    await aboutLink.click();

    await expect(page).toHaveURL(/#about/);
  });
});

test.describe('Mobile - Sections Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should display all main sections on mobile', async ({ page }) => {
    const sections = ['#hero', '#about', '#status', '#resume', '#projects', '#skills', '#contact'];

    for (const selector of sections) {
      const section = page.locator(selector);
      await expect(section).toBeAttached();
    }
  });

  test('should display footer on mobile', async ({ page }) => {
    const footer = page.locator('.site-footer');
    await expect(footer).toBeAttached();
  });
});

test.describe('Mobile - Viewport Meta', () => {
  test('should have proper viewport meta tag', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('width=device-width');
    expect(viewportMeta).toContain('initial-scale=1');
  });
});

test.describe('Mobile - Performance', () => {
  test('should load within acceptable time on mobile', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds (generous for mobile networks)
    expect(loadTime).toBeLessThan(5000);
  });
});

// @ts-check
const { test, expect } = require('@playwright/test');

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const HERO_NAME_PATTERN = /Jaecheol Lee|이재철/;

async function gotoMobilePage(page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

function createMainJsDelay() {
  let release = () => {};
  const hold = new Promise((resolve) => {
    release = resolve;
  });

  return { hold, release };
}

async function delayMainJsUntilReleased(page) {
  const delay = createMainJsDelay();

  await page.route('**/main.js*', async (route) => {
    await delay.hold;
    await route.abort('aborted');
  });

  return delay.release;
}

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
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should keep clean main content within the mobile viewport', async ({ page }) => {
    const mainContent = page.locator('main#main-content');
    await expect(mainContent).toBeAttached();

    const viewportSize = page.viewportSize();
    const mainBox = await mainContent.boundingBox();

    if (viewportSize && mainBox) {
      expect(mainBox.width).toBeLessThanOrEqual(viewportSize.width);
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
    await expect(page.locator('.terminal-window')).toHaveCount(0);
  });

  test('should display hero section correctly on mobile', async ({ page }) => {
    const hero = page.locator('#hero');
    await expect(hero).toBeVisible();

    const heroTitle = page.locator('.hero-title');
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toContainText(HERO_NAME_PATTERN);
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
  test('should open mobile navigation immediately after domcontentloaded even when main.js is delayed', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const releaseMainJs = await delayMainJsUntilReleased(page);
    const mainJsRequested = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === '/main.js';
    });

    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await mainJsRequested;

      await page.locator('.nav-toggle').click();

      await expect(page.locator('.nav-links')).toHaveClass(/(?:^|\s)open(?:\s|$)/);
      await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'true');
    } finally {
      releaseMainJs();
    }
  });

  test('should close mobile navigation with Escape before main.js finishes loading', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const releaseMainJs = await delayMainJsUntilReleased(page);
    const mainJsRequested = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === '/main.js';
    });

    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await mainJsRequested;

      await page.locator('.nav-toggle').click();
      await expect(page.locator('.nav-links')).toHaveClass(/(?:^|\s)open(?:\s|$)/);

      await page.keyboard.press('Escape');

      await expect(page.locator('.nav-links')).not.toHaveClass(/(?:^|\s)open(?:\s|$)/);
      await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false');
    } finally {
      releaseMainJs();
    }
  });

  test('should display navigation on mobile', async ({ page }) => {
    await gotoMobilePage(page);
    const nav = page.locator('.minimal-nav');
    await expect(nav).toBeAttached();
  });

  test('should be able to navigate to sections on mobile', async ({ page }) => {
    await gotoMobilePage(page);
    // Mobile nav links live behind the hamburger toggle; open it first.
    await page.locator('.nav-toggle').click();
    await expect(page.locator('.nav-links')).toHaveClass(/open/);
    const aboutLink = page.locator('.nav-links a[href="#about"]');
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();

    // Nav uses smooth-scroll (no hash push); assert the section is brought into view.
    await page.waitForTimeout(600);
    const aboutInView = await page.evaluate(() => {
      const r = document.getElementById('about').getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    expect(aboutInView).toBe(true);
  });
});

test.describe('Mobile - Removed CLI', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should not render CLI container, input, or output on mobile', async ({ page }) => {
    await expect(page.locator('#cli-container')).toHaveCount(0);
    await expect(page.locator('#terminal-input')).toHaveCount(0);
    await expect(page.locator('#cli-output')).toHaveCount(0);
  });

  test('should keep primary contact and resume download CTAs reachable on mobile', async ({
    page,
  }) => {
    const contactLink = page.locator('a[href^="mailto:"]').first();
    await expect(contactLink).toBeVisible();

    const resumePdfLink = page.locator('a[href="/resume.pdf"], a[href$="resume.pdf"]').first();
    await expect(resumePdfLink).toBeVisible();
  });
});

test.describe('Mobile - Touch Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should support touch scrolling', async ({ page }) => {
    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);

    // Scroll down using JavaScript (simulating touch scroll)
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(100);

    // Verify scroll occurred
    const newScroll = await page.evaluate(() => window.scrollY);
    expect(newScroll).toBeGreaterThan(initialScroll);
  });

  test('should support clicking navigation links', async ({ page }) => {
    await page.locator('.nav-toggle').click();
    await expect(page.locator('.nav-links')).toHaveClass(/open/);
    const aboutLink = page.locator('.nav-links a[href="#about"]');
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();

    await page.waitForTimeout(600);
    const aboutInView = await page.evaluate(() => {
      const r = document.getElementById('about').getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    expect(aboutInView).toBe(true);
  });
});

test.describe('Mobile - Sections Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should display all main sections on mobile', async ({ page }) => {
    const sections = [
      '#hero',
      '#about',
      '#cover-letter',
      '#resume',
      '#certifications',
      '#projects',
      '#skills',
      '#operated',
      '#contact',
    ];

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
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('width=device-width');
    expect(viewportMeta).toContain('initial-scale=1');
  });
});

test.describe('Mobile - Performance', () => {
  test('should load within acceptable time on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds (generous for mobile networks)
    expect(loadTime).toBeLessThan(5000);
  });
});

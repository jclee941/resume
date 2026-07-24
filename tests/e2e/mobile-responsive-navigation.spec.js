// @ts-check
const { test, expect } = require('@playwright/test');

const MOBILE_VIEWPORT = { width: 390, height: 844 };

/** @param {import('@playwright/test').Page} page */
async function gotoMobilePage(page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

function createMainJsDelay() {
  let release = () => {};
  const hold = new Promise((resolve) => {
    release = () => resolve(undefined);
  });

  return { hold, release };
}

/** @param {import('@playwright/test').Page} page */
async function delayMainJsUntilReleased(page) {
  const delay = createMainJsDelay();

  await page.route('**/main.js*', async (route) => {
    await delay.hold;
    await route.abort('aborted');
  });

  return delay.release;
}

test.describe('Mobile - Navigation', () => {
  test('English mobile navigation announces open and closed states', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });

    const toggle = page.locator('.nav-toggle');

    await expect(toggle).toHaveAttribute('aria-label', /^Open navigation/);

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAttribute('aria-label', 'Close navigation');

    await page.keyboard.press('Escape');

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-label', 'Open navigation');
  });

  test('should open mobile navigation immediately after domcontentloaded even when main.js is delayed', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const releaseMainJs = await delayMainJsUntilReleased(page);
    const mainJsRequested = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === '/main.js';
    });

    const navigation = page.goto('/', { waitUntil: 'domcontentloaded' });
    try {
      await mainJsRequested;

      await page.locator('.nav-toggle').click();

      await expect(page.locator('.nav-links')).toHaveClass(/(?:^|\s)open(?:\s|$)/);
      await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'true');
    } finally {
      releaseMainJs();
      await navigation;
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

    const navigation = page.goto('/', { waitUntil: 'domcontentloaded' });
    try {
      await mainJsRequested;

      await page.locator('.nav-toggle').click();
      await expect(page.locator('.nav-links')).toHaveClass(/(?:^|\s)open(?:\s|$)/);

      await page.keyboard.press('Escape');

      await expect(page.locator('.nav-links')).not.toHaveClass(/(?:^|\s)open(?:\s|$)/);
      await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false');
    } finally {
      releaseMainJs();
      await navigation;
    }
  });

  test('should display navigation on mobile', async ({ page }) => {
    await gotoMobilePage(page);
    const nav = page.locator('.minimal-nav');
    await expect(nav).toBeAttached();
  });

  test('should be able to navigate to sections on mobile', async ({ page }) => {
    await gotoMobilePage(page);
    await page.locator('.nav-toggle').click();
    await expect(page.locator('.nav-links')).toHaveClass(/open/);
    const aboutLink = page.locator('.nav-links a[href="#about"]');
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();

    await page.waitForTimeout(600);
    const aboutInView = await page.evaluate(() => {
      const about = document.getElementById('about');
      if (!about) return false;
      const r = about.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    expect(aboutInView).toBe(true);
  });
});

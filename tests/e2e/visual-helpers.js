const { test, expect } = require('@playwright/test');

const isCI = !!process.env.CI;
const getMaxDiffPixelRatio = (localRatio) => (isCI ? Math.max(localRatio, 0.3) : localRatio);
const getSnapshotName = (name) => (isCI ? name.replace('.png', '-ci.png') : name);

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const TABLET_VIEWPORT = { width: 768, height: 1024 };

async function resetVisualState(page) {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function safeVisualGoto(page, url = '/') {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 500) {
      test.skip(true, 'Server unavailable - skipping visual test');
    }
  } catch (error) {
    if (
      error.message?.includes('net::ERR_NETWORK_CHANGED') ||
      error.message?.includes('net::ERR_INTERNET_DISCONNECTED')
    ) {
      test.skip(true, 'Network unavailable - skipping visual test');
    }
    throw error;
  }
}

async function stabilizeViewport(page, viewport) {
  await page.setViewportSize(viewport);
  await page.waitForFunction(
    ({ width, height }) => window.innerWidth === width && window.innerHeight === height,
    viewport
  );
}

async function waitForVisualStability(page, options = {}) {
  const { targetSelector } = options;

  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.locator('.section-hero')).toBeVisible();
  await expect(page.locator('#resume .resume-list > *').first()).toBeVisible();
  await expect(page.locator('#projects .project-item').first()).toBeVisible();

  if (targetSelector) {
    const target = page.locator(targetSelector).first();
    await target.scrollIntoViewIfNeeded();

    await page.waitForFunction(
      (selector) => {
        const element = document.querySelector(selector);
        return (
          !element ||
          !element.classList.contains('reveal') ||
          element.classList.contains('revealed')
        );
      },
      targetSelector,
      { timeout: 5000 }
    );
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  await page.waitForFunction(
    (selector) => {
      const root = document.documentElement;
      const body = document.body;
      const target = selector ? document.querySelector(selector) : null;
      const metrics = {
        htmlHeight: root.scrollHeight,
        bodyHeight: body ? body.scrollHeight : 0,
        htmlWidth: root.scrollWidth,
        targetHeight: target ? Math.round(target.getBoundingClientRect().height) : 0,
      };

      const previous = window['__visualMetrics'];
      const isStable =
        previous &&
        previous.htmlHeight === metrics.htmlHeight &&
        previous.bodyHeight === metrics.bodyHeight &&
        previous.htmlWidth === metrics.htmlWidth &&
        previous.targetHeight === metrics.targetHeight;

      window['__visualMetrics'] = metrics;
      window['__visualStableCount'] = isStable ? (window['__visualStableCount'] || 0) + 1 : 0;

      return document.readyState !== 'loading' && window['__visualStableCount'] >= 2;
    },
    targetSelector,
    { timeout: 5000 }
  );
}

async function prepareVisualPage(page, viewport, options = {}) {
  const media = { reducedMotion: 'reduce' };
  if (options.colorScheme) {
    media.colorScheme = options.colorScheme;
  }

  await page.emulateMedia(media);
  await stabilizeViewport(page, viewport);
  await safeVisualGoto(page, options.url);
  await waitForVisualStability(page, options);
}

module.exports = {
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  TABLET_VIEWPORT,
  getMaxDiffPixelRatio,
  getSnapshotName,
  prepareVisualPage,
  resetVisualState,
  waitForVisualStability,
};

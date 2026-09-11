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

async function waitForRenderedFonts(page) {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument');
    for (const [selector, fontName] of [
      ['.project-link-title', 'IBMPlexMono-Medium'],
      ['.project-tech', 'IBMPlexMono-Regular'],
      ['.project-description', 'Inter-Regular'],
    ]) {
      const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      await expect
        .poll(
          async () => {
            const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
            return fonts.filter((font) => font.isCustomFont).map((font) => font.postScriptName);
          },
          { message: `${selector} must render ${fontName}` }
        )
        .toContain(fontName);
    }
  } finally {
    await session.detach();
  }
}

async function waitForVisualStability(page, options = {}) {
  const { targetSelector } = options;

  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.locator('.section-hero')).toBeVisible();
  await expect(page.locator('#resume .resume-list > *').first()).toBeVisible();
  await expect(page.locator('#projects .project-item').first()).toBeVisible();
  await expect(page.locator('.role-chip').first()).toBeEnabled();
  await expect(page.locator('.skill-domain-card').first()).toBeVisible();
  const loadedFonts = await page.evaluate(async () => {
    for (const sheet of document.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSFontFaceRule) rule.style.setProperty('font-display', 'block');
      }
    }
    const fonts = [...document.fonts];
    await Promise.all(fonts.map((font) => font.load()));
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return fonts.map((font) => `${font.family}:${font.weight}`);
  });
  expect(loadedFonts).toEqual(
    expect.arrayContaining([
      'IBM Plex Mono:300',
      'IBM Plex Mono:400',
      'IBM Plex Mono:500',
      'IBM Plex Mono:700',
      'Inter:400',
      'Inter:700',
    ])
  );
  await waitForRenderedFonts(page);

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
        scrollY: window.scrollY,
        targetHeight: target ? Math.round(target.getBoundingClientRect().height) : 0,
        targetTop: target ? target.getBoundingClientRect().top : 0,
      };

      const previous = window['__visualMetrics'];
      const isStable =
        previous &&
        previous.htmlHeight === metrics.htmlHeight &&
        previous.bodyHeight === metrics.bodyHeight &&
        previous.htmlWidth === metrics.htmlWidth &&
        previous.scrollY === metrics.scrollY &&
        previous.targetHeight === metrics.targetHeight &&
        previous.targetTop === metrics.targetTop;

      window['__visualMetrics'] = metrics;
      window['__visualStableCount'] = isStable ? (window['__visualStableCount'] || 0) + 1 : 0;

      return document.readyState !== 'loading' && window['__visualStableCount'] >= 2;
    },
    targetSelector,
    { timeout: 5000 }
  );

  await page.locator('.recruiter-action-bar__dismiss').dispatchEvent('click');
  await expect(page.locator('.recruiter-action-bar')).toBeHidden();
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

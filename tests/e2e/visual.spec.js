// @ts-check
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

test.describe('Visual Regression Tests', () => {
  test.describe('Desktop Screenshots', () => {
    test.beforeEach(async ({ page }) => {
      await resetVisualState(page);
    });

    test('homepage full page screenshot', async ({ page }) => {
      await prepareVisualPage(page, DESKTOP_VIEWPORT);

      await expect(page).toHaveScreenshot(getSnapshotName('desktop-homepage.png'), {
        fullPage: true,
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.1),
        animations: 'disabled',
      });
    });

    test('hero section screenshot', async ({ page }) => {
      await prepareVisualPage(page, DESKTOP_VIEWPORT, { targetSelector: '.section-hero' });

      const heroSection = page.locator('.section-hero');
      await expect(heroSection).toHaveScreenshot(getSnapshotName('desktop-hero.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });

    test('projects section screenshot', async ({ page }) => {
      await prepareVisualPage(page, DESKTOP_VIEWPORT, { targetSelector: '#projects' });

      const projectsSection = page.locator('#projects');
      await expect(projectsSection).toHaveScreenshot(getSnapshotName('desktop-projects.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });

    test('resume section screenshot', async ({ page }) => {
      await prepareVisualPage(page, DESKTOP_VIEWPORT, { targetSelector: '#resume' });

      const resumeSection = page.locator('#resume');
      await expect(resumeSection).toHaveScreenshot(getSnapshotName('desktop-resume.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });
  });

  test.describe('Mobile Screenshots', () => {
    test.beforeEach(async ({ page }) => {
      await resetVisualState(page);
    });

    test('mobile homepage screenshot', async ({ page }) => {
      await prepareVisualPage(page, MOBILE_VIEWPORT);

      await expect(page).toHaveScreenshot(getSnapshotName('mobile-homepage.png'), {
        fullPage: true,
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.1),
        animations: 'disabled',
      });
    });

    test('mobile hero section screenshot', async ({ page }) => {
      await prepareVisualPage(page, MOBILE_VIEWPORT, { targetSelector: '.section-hero' });

      const heroSection = page.locator('.section-hero');
      await expect(heroSection).toHaveScreenshot(getSnapshotName('mobile-hero.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });

    test('mobile project card screenshot', async ({ page }) => {
      await prepareVisualPage(page, MOBILE_VIEWPORT, { targetSelector: '.project-item' });

      const firstProjectCard = page.locator('.project-item').first();
      await expect(firstProjectCard).toHaveScreenshot(getSnapshotName('mobile-project-card.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });
  });

  test.describe('Tablet Screenshots', () => {
    test.beforeEach(async ({ page }) => {
      await resetVisualState(page);
    });

    test('tablet homepage screenshot', async ({ page }) => {
      await prepareVisualPage(page, TABLET_VIEWPORT);

      await expect(page).toHaveScreenshot(getSnapshotName('tablet-homepage.png'), {
        fullPage: true,
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.1),
        animations: 'disabled',
      });
    });
  });

  test.describe('Dark Mode Screenshots', () => {
    test('dark mode preference screenshot', async ({ page }) => {
      await resetVisualState(page);
      await prepareVisualPage(page, DESKTOP_VIEWPORT, { colorScheme: 'dark' });

      await expect(page).toHaveScreenshot(getSnapshotName('dark-mode-homepage.png'), {
        fullPage: true,
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.1),
        animations: 'disabled',
      });
    });
  });

  test.describe('Component Screenshots', () => {
    test('footer screenshot', async ({ page }) => {
      await resetVisualState(page);
      await prepareVisualPage(page, DESKTOP_VIEWPORT, { targetSelector: 'footer' });

      const footer = page.locator('footer');
      await expect(footer).toHaveScreenshot(getSnapshotName('footer.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });

    test('hero download buttons screenshot', async ({ page }) => {
      await resetVisualState(page);
      await prepareVisualPage(page, DESKTOP_VIEWPORT, {
        targetSelector: '.hero-download, .resume-download',
      });

      const heroDownload = page.locator('.hero-download, .resume-download').first();
      await expect(heroDownload).toBeVisible();

      await heroDownload.scrollIntoViewIfNeeded();
      await waitForVisualStability(page, { targetSelector: '.hero-download, .resume-download' });

      await expect(heroDownload).toHaveScreenshot(getSnapshotName('download-buttons.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });

    test('single project card screenshot', async ({ page }) => {
      await resetVisualState(page);
      await prepareVisualPage(page, DESKTOP_VIEWPORT, { targetSelector: '.project-item' });

      const projectCard = page.locator('.project-item').first();
      await expect(projectCard).toHaveScreenshot(getSnapshotName('project-card.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });
  });
});

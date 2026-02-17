// @ts-check
const { test, expect } = require('@playwright/test');

const isCI = !!process.env.CI;
const getMaxDiffPixelRatio = (localRatio) => (isCI ? Math.max(localRatio, 0.3) : localRatio);
const getSnapshotName = (name) => (isCI ? name.replace('.png', '-ci.png') : name);

test.describe('Visual Regression Tests', () => {
  test.describe('Desktop Screenshots', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('homepage full page screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveScreenshot(getSnapshotName('desktop-homepage.png'), {
        fullPage: true,
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.1),
        animations: 'disabled',
      });
    });

    test('hero section screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const heroSection = page.locator('.section-hero');
      await expect(heroSection).toHaveScreenshot(getSnapshotName('desktop-hero.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });

    test('projects section screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const projectsSection = page.locator('#projects');
      await expect(projectsSection).toHaveScreenshot(getSnapshotName('desktop-projects.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });

    test('resume section screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const resumeSection = page.locator('#resume');
      await expect(resumeSection).toHaveScreenshot(getSnapshotName('desktop-resume.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });
  });

  test.describe('Mobile Screenshots', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('mobile homepage screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveScreenshot(getSnapshotName('mobile-homepage.png'), {
        fullPage: true,
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.1),
        animations: 'disabled',
      });
    });

    test('mobile hero section screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const heroSection = page.locator('.section-hero');
      await expect(heroSection).toHaveScreenshot(getSnapshotName('mobile-hero.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });

    test('mobile project card screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const firstProjectCard = page.locator('.project-item').first();
      await expect(firstProjectCard).toHaveScreenshot(getSnapshotName('mobile-project-card.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });
  });

  test.describe('Tablet Screenshots', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
    });

    test('tablet homepage screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveScreenshot(getSnapshotName('tablet-homepage.png'), {
        fullPage: true,
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.1),
        animations: 'disabled',
      });
    });
  });

  test.describe('Dark Mode Screenshots', () => {
    test('dark mode preference screenshot', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveScreenshot(getSnapshotName('dark-mode-homepage.png'), {
        fullPage: true,
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.1),
        animations: 'disabled',
      });
    });
  });

  test.describe('Component Screenshots', () => {
    test('footer screenshot', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const footer = page.locator('footer');
      await expect(footer).toHaveScreenshot(getSnapshotName('footer.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });

    test('hero download buttons screenshot', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const heroDownload = page.locator('.hero-download');
      test.skip(
        (await heroDownload.count()) === 0,
        'hero-download section is not present in current theme'
      );

      await expect(heroDownload).toHaveScreenshot(getSnapshotName('download-buttons.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });

    test('single project card screenshot', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const projectCard = page.locator('.project-item').first();
      await expect(projectCard).toHaveScreenshot(getSnapshotName('project-card.png'), {
        maxDiffPixelRatio: getMaxDiffPixelRatio(0.05),
      });
    });
  });
});

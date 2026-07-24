// @ts-check
const { test, expect } = require('@playwright/test');
const {
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  TABLET_VIEWPORT,
  getMaxDiffPixelRatio,
  getSnapshotName,
  prepareVisualPage,
  resetVisualState,
  waitForVisualStability,
} = require('./visual-helpers');

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

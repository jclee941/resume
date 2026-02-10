// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Visual Regression Tests', () => {
  test.describe('Desktop Screenshots', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('homepage full page screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('desktop-homepage.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.1,
      });
    });

    test('hero section screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const heroSection = page.locator('.section-hero');
      await expect(heroSection).toHaveScreenshot('desktop-hero.png', {
        maxDiffPixelRatio: 0.05,
      });
    });

    test('projects section screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const projectsSection = page.locator('#projects');
      await expect(projectsSection).toHaveScreenshot('desktop-projects.png', {
        maxDiffPixelRatio: 0.05,
      });
    });

    test('resume section screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const resumeSection = page.locator('#resume');
      await expect(resumeSection).toHaveScreenshot('desktop-resume.png', {
        maxDiffPixelRatio: 0.05,
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
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('mobile-homepage.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.1,
      });
    });

    test('mobile hero section screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const heroSection = page.locator('.section-hero');
      await expect(heroSection).toHaveScreenshot('mobile-hero.png', {
        maxDiffPixelRatio: 0.05,
      });
    });

    test('mobile project card screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const firstProjectCard = page.locator('.project-item').first();
      await expect(firstProjectCard).toHaveScreenshot('mobile-project-card.png', {
        maxDiffPixelRatio: 0.05,
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
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('tablet-homepage.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.1,
      });
    });
  });

  test.describe('Dark Mode Screenshots', () => {
    test('dark mode preference screenshot', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dark-mode-homepage.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.1,
      });
    });
  });

  test.describe('Component Screenshots', () => {
    test('footer screenshot', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const footer = page.locator('footer');
      await expect(footer).toHaveScreenshot('footer.png', {
        maxDiffPixelRatio: 0.05,
      });
    });

    test('hero download buttons screenshot', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const heroDownload = page.locator('.hero-download');
      await expect(heroDownload).toHaveScreenshot('download-buttons.png', {
        maxDiffPixelRatio: 0.05,
      });
    });

    test('single project card screenshot', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const projectCard = page.locator('.project-item').first();
      await expect(projectCard).toHaveScreenshot('project-card.png', {
        maxDiffPixelRatio: 0.05,
      });
    });
  });
});

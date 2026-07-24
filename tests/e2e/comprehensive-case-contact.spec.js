// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Case Studies Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should not render a standalone case studies section', async ({ page }) => {
    await expect(page.locator('#case-studies')).toHaveCount(0);
  });
});

test.describe('Contact Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have section header', async ({ page }) => {
    const heading = page.locator('#contact').getByRole('heading').first();
    await expect(heading).toBeVisible();
    await expect(page.locator('.section-cmd')).toHaveCount(0);
  });

  test('should display contact links', async ({ page }) => {
    const visibleContactLinkCount = await page.locator('#contact').evaluate((section) => {
      return Array.from(section.querySelectorAll('a[href]')).filter(
        (link) => link.getClientRects().length > 0
      ).length;
    });

    expect(visibleContactLinkCount).toBeGreaterThan(0);
  });

  test('should have valid email link', async ({ page }) => {
    const emailLink = page.locator('#contact a[href^="mailto:"]').last();
    const href = await emailLink.getAttribute('href');
    expect(href).toMatch(/^mailto:/);
  });

  test('should have valid GitHub link', async ({ page }) => {
    const githubLink = page.locator('#contact a[href*="github.com"]').last();
    await expect(githubLink).toHaveAttribute('target', '_blank');
  });
});

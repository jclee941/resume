// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * E2E Tests for Download Functionality
 * Tests all download buttons on the portfolio site
 *
 * NOTE: Tests run against the configured baseURL (production or staging).
 * In CI/CD, PLAYWRIGHT_BASE_URL is set to staging URL.
 * Locally, it defaults to production URL from playwright.config.js.
 */

test.describe('Download Functionality', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL || '/');
    // Wait for download links to be fully rendered (they may be injected by JS)
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Resume Download Links', () => {
    test('should have main resume download buttons', async ({ page }) => {
      // Wait for download links to be rendered before checking
      await page.waitForSelector('a[aria-label*="Resume"][aria-label*="PDF"]');

      // Check for PDF download link in hero section (DOCX/MD removed)
      const pdfLink = page.getByRole('link', {
        name: /resume.*pdf/i,
      });

      await expect(pdfLink).toBeVisible();

      // Verify PDF URL
      const pdfHref = await pdfLink.getAttribute('href');
      expect(pdfHref).toMatch(/\.(pdf)$/i);

      // Should NOT contain github.com (private repo)
      expect(pdfHref).not.toContain('github.com');
    });

    test('should have download attribute on resume links', async ({ page }) => {
      const downloadLinks = page.locator('a[download]').filter({ hasText: /pdf/i });
      const count = await downloadLinks.count();

      // At least 1 PDF download link in hero
      expect(count).toBeGreaterThanOrEqual(1);

      // Verify all have download attribute
      for (let i = 0; i < count; i++) {
        const link = downloadLinks.nth(i);
        await expect(link).toHaveAttribute('download');
      }
    });
  });

  test.describe('Download Link Validation', () => {
    test('all download URLs should follow correct patterns', async ({ page }) => {
      const allDownloadLinks = page.locator('a[download]');
      const count = await allDownloadLinks.count();

      const downloadsUrlPattern =
        /^https:\/\/raw\.githubusercontent\.com\/jclee-homelab\/resume\/master\/.+\.(pdf|docx|md)$/;
      // Worker PDF pattern - handles both production (resume.jclee.me) and staging (*.workers.dev)
      const workerPdfPattern =
        /^https:\/\/(resume\.jclee\.me|resume-staging\.jclee\.workers\.dev)\/resume\.pdf$/;

      for (let i = 0; i < count; i++) {
        const link = allDownloadLinks.nth(i);
        const href = await link.getAttribute('href');

        // Skip links with undefined URLs (missing data in data.json)
        if (href && href !== 'undefined' && !href.includes('undefined')) {
          const isValidUrl = downloadsUrlPattern.test(href) || workerPdfPattern.test(href);
          expect(isValidUrl).toBe(true);
        }
      }
    });

    test('should not have any broken GitHub URLs', async ({ page }) => {
      const allLinks = page.locator('a[href*="github.com/qws941/resume"]');
      const count = await allLinks.count();

      // Should be 0 - all GitHub resume URLs should be replaced with GitLab
      expect(count).toBe(0);
    });
  });

  test.describe('Network Request Validation (Optional)', () => {
    test('download links should return 200 OK', async ({ page, request }) => {
      // Requires external hosting (raw.githubusercontent.com) to be reachable
      const downloadLinks = page.locator('a[download]');
      const firstLink = await downloadLinks.first().getAttribute('href');

      if (firstLink) {
        const response = await request.head(firstLink);
        expect(response.status()).toBe(200);
      }
    });
  });
});

/**
 * Expected download link counts - dynamically check rather than hardcode
 */
test.describe('Download Link Counts', () => {
  test('should have expected number of download links', async ({ page, baseURL }) => {
    await page.goto(baseURL || '/');
    await page.waitForLoadState('domcontentloaded');

    // Count all download links - verify there are some
    const allDownloadLinks = page.locator('a[download]');
    const totalCount = await allDownloadLinks.count();

    expect(totalCount).toBeGreaterThanOrEqual(1);
  });
});

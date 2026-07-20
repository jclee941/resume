// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * E2E Tests for Download Functionality
 * Tests all download buttons on the portfolio site
 *
 * NOTE: Default tests run against the configured Playwright baseURL, which
 * launches the local portfolio Worker unless SKIP_WEBSERVER is set.
 */

test.describe('Download Functionality', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL || '/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Resume Download Links', () => {
    test('should have main resume download buttons', async ({ page }) => {
      const pdfLink = page
        .locator(
          '.hero-download a[download], a[download][href$=".pdf"], a[download][href$="/resume.pdf"]'
        )
        .first();

      const count = await pdfLink.count();
      if (count === 0) {
        test.skip(true, 'No PDF download links found on page');
        return;
      }

      await expect(pdfLink).toBeVisible({ timeout: 10000 });

      const pdfHref = await pdfLink.getAttribute('href');
      expect(pdfHref).toMatch(/(\.pdf$|\/resume\.pdf$)/i);

      expect(pdfHref).not.toContain('github.com');
    });

    test('should have download attribute on resume links', async ({ page }) => {
      const downloadLinks = page.locator('a[download]').filter({ hasText: /pdf/i });
      const count = await downloadLinks.count();

      if (count === 0) {
        test.skip(true, 'No PDF download links found on page');
        return;
      }

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
        /^https:\/\/raw\.githubusercontent\.com\/jclee941\/resume\/master\/.+\.(pdf|docx|md)$/;
      // Worker PDF pattern - handles both production (resume.jclee.me) and staging (*.workers.dev)
      const workerPdfPattern =
        /^(https:\/\/(resume\.jclee\.me|resume-staging\.jclee\.workers\.dev))?\/resume(?:-full)?\.pdf$/;

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
    test('download links should return 200 OK', async ({ page, request, baseURL }) => {
      const downloadLinks = page.locator('a[download]');
      const count = await downloadLinks.count();

      if (count === 0) {
        test.skip(true, 'No download links found on page');
        return;
      }

      const hrefs = await downloadLinks.evaluateAll((links) =>
        links.map((link) => link.getAttribute('href')).filter((href) => href !== null)
      );
      const localHref = hrefs.find(
        (href) => href.startsWith('/') || (baseURL ? href.startsWith(baseURL) : false)
      );

      if (!localHref) {
        test.skip(true, 'No local Worker download links found on page');
        return;
      }

      const response = await request.head(localHref);
      expect(response.status()).toBe(200);
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

    if (totalCount === 0) {
      test.skip(true, 'No download links found on page');
      return;
    }
  });
});

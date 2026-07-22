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

      // The resume PDF download link is static server-rendered markup
      // (apps/portfolio/index.html .hero-download); its absence is a real
      // regression, not an environment condition worth skipping past.
      const count = await pdfLink.count();
      expect(count).toBeGreaterThan(0);

      await expect(pdfLink).toBeVisible({ timeout: 10000 });

      const pdfHref = await pdfLink.getAttribute('href');
      expect(pdfHref).toMatch(/(\.pdf$|\/resume\.pdf$)/i);

      expect(pdfHref).not.toContain('github.com');
    });

    test('should have download attribute on resume links', async ({ page }) => {
      const downloadLinks = page.locator('a[download]').filter({ hasText: /pdf/i });
      const count = await downloadLinks.count();

      // Same static markup as above: absence here is a real regression.
      expect(count).toBeGreaterThan(0);

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

      // Same static markup as the resume download tests above: absence of
      // any download link, or of a local Worker-served one, is a real
      // regression rather than an environment condition worth skipping past.
      expect(count).toBeGreaterThan(0);

      const hrefs = await downloadLinks.evaluateAll((links) =>
        links.map((link) => link.getAttribute('href')).filter((href) => href !== null)
      );
      const localHref = hrefs.find(
        (href) => href.startsWith('/') || (baseURL ? href.startsWith(baseURL) : false)
      );

      expect(localHref).toBeTruthy();

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

    // Count all download links - verify there are some.
    // Previously this test had no assertion in either branch (it skipped on
    // zero and did nothing on non-zero), so it was structurally incapable of
    // failing. The resume download link is static server-rendered markup
    // (apps/portfolio/index.html .hero-download), so its absence is a real
    // regression, not an environment condition worth skipping past.
    const allDownloadLinks = page.locator('a[download]');
    const totalCount = await allDownloadLinks.count();

    expect(totalCount).toBeGreaterThan(0);
  });
});

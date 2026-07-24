// @ts-check
const { test, expect } = require('@playwright/test');

const NAME_PATTERN = /Jaecheol Lee|이재철/;
const CANONICAL_URL_PATTERN = /^https:\/\/resume\.jclee\.me\/(?:en\/|ja\/)?$/;

const configuredBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL || (process.env.CI ? 'http://localhost:8787' : '');
const isLocalhost = /127\.0\.0\.1|localhost/.test(configuredBaseUrl);

function skipIfLocalRateLimited(response, testInfo) {
  if (isLocalhost && response && response.status() === 429) {
    testInfo.skip(true, 'Rate-limited by local wrangler dev server');
    return true;
  }
  return false;
}

test.describe('Twitter Card Tags', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (skipIfLocalRateLimited(response, testInfo)) {
      return;
    }
  });

  test('should have twitter:card', async ({ page }) => {
    const twitterCard = await page.getAttribute('meta[name="twitter:card"]', 'content');
    expect(twitterCard).toBe('summary_large_image');
  });

  test('should have twitter:url', async ({ page }) => {
    const twitterUrl = await page.getAttribute('meta[name="twitter:url"]', 'content');
    expect(twitterUrl).toMatch(CANONICAL_URL_PATTERN);
  });

  test('should have twitter:title', async ({ page }) => {
    const twitterTitle = await page.getAttribute('meta[name="twitter:title"]', 'content');
    expect(twitterTitle).toBeTruthy();
    expect(twitterTitle).toMatch(NAME_PATTERN);
  });

  test('should have twitter:description', async ({ page }) => {
    const twitterDescription = await page.getAttribute(
      'meta[name="twitter:description"]',
      'content'
    );
    expect(twitterDescription).toBeTruthy();
    if (!twitterDescription) {
      throw new Error('twitter:description is missing');
    }
    expect(twitterDescription.length).toBeGreaterThan(20);
  });

  test('should have twitter:image with alt', async ({ page }) => {
    const twitterImageMeta = page.locator('meta[name="twitter:image"]');
    await expect(twitterImageMeta).toHaveAttribute('content', /og-image(-[a-z]{2})?\.(webp|png)$/);

    const twitterImage = await twitterImageMeta.getAttribute('content');
    expect(twitterImage).toBeTruthy();
  });

  test('should have twitter:creator and site', async ({ page }) => {
    const twitterCreator = await page.getAttribute('meta[name="twitter:creator"]', 'content');
    expect(twitterCreator).toBeTruthy();
    expect(twitterCreator).toMatch(/^@/);

    const twitterSite = await page.getAttribute('meta[name="twitter:site"]', 'content');
    expect(twitterSite).toBeTruthy();
    expect(twitterSite).toMatch(/^@/);
  });
});

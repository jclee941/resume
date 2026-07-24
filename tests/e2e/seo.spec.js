// @ts-check
const { test, expect } = require('@playwright/test');

const NAME_PATTERN = /Jaecheol Lee|이재철/;
const INFRA_PATTERN = /Infrastructure|인프라/i;
const CANONICAL_URL_PATTERN = /^https:\/\/resume\.jclee\.me\/(?:en\/|ja\/)?$/;
const OG_LOCALE_PATTERN = /ko_KR|en_US/;

const configuredBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL || (process.env.CI ? 'http://localhost:8787' : '');
const isLocalhost = /127\.0\.0\.1|localhost/.test(configuredBaseUrl);

/**
 * @param {import('@playwright/test').Response | null} response
 * @param {import('@playwright/test').TestInfo} testInfo
 */
function skipIfLocalRateLimited(response, testInfo) {
  if (isLocalhost && response && response.status() === 429) {
    testInfo.skip(true, 'Rate-limited by local wrangler dev server');
    return true;
  }
  return false;
}

test.describe('SEO Meta Tags', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (skipIfLocalRateLimited(response, testInfo)) {
      return;
    }
  });

  test('should have proper page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toMatch(NAME_PATTERN);
  });

  test('should have meta description', async ({ page }) => {
    const descriptionMeta = page.locator('meta[name="description"]');
    await expect(descriptionMeta).toHaveAttribute('content', /.+/);

    const description = await descriptionMeta.getAttribute('content');
    expect(description).toBeTruthy();
    if (!description) {
      throw new Error('meta description is missing');
    }
    expect(description.length).toBeGreaterThan(20);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(description).toMatch(INFRA_PATTERN);
  });

  test('should have meta keywords', async ({ page }) => {
    const keywords = await page.getAttribute('meta[name="keywords"]', 'content');
    expect(keywords).toBeTruthy();
    expect(keywords).toContain('Observability');
  });

  test('should have meta author', async ({ page }) => {
    const author = await page.getAttribute('meta[name="author"]', 'content');
    expect(author).toBeTruthy();
    expect(author).toMatch(NAME_PATTERN);
  });

  test('should have meta robots', async ({ page }) => {
    const robots = await page.getAttribute('meta[name="robots"]', 'content');
    expect(robots).toBe('index, follow');
  });

  test('should have canonical URL', async ({ page }) => {
    const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
    expect(canonical).toMatch(CANONICAL_URL_PATTERN);
  });

  test('should have proper charset and viewport', async ({ page }) => {
    const charset = await page.getAttribute('meta[charset]', 'charset');
    expect(charset).toBe('UTF-8');

    const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });
});

test.describe('Open Graph Tags', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (skipIfLocalRateLimited(response, testInfo)) {
      return;
    }
  });

  test('should have og:type', async ({ page }) => {
    const ogType = await page.getAttribute('meta[property="og:type"]', 'content');
    expect(ogType).toBe('profile');
  });

  test('should have og:url', async ({ page }) => {
    const ogUrl = await page.getAttribute('meta[property="og:url"]', 'content');
    expect(ogUrl).toMatch(CANONICAL_URL_PATTERN);
  });

  test('should have og:title', async ({ page }) => {
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle).toMatch(NAME_PATTERN);
  });

  test('should have og:description', async ({ page }) => {
    const ogDescription = await page.getAttribute('meta[property="og:description"]', 'content');
    expect(ogDescription).toBeTruthy();
    if (!ogDescription) {
      throw new Error('og:description is missing');
    }
    expect(ogDescription.length).toBeGreaterThan(20);
  });

  test('should have og:image with dimensions', async ({ page }) => {
    const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
    expect(ogImage).toBeTruthy();
    // Accept locale variants (og-image.webp, og-image-en.webp, og-image-ja.webp).
    expect(ogImage).toMatch(/og-image(-[a-z]{2})?\.(webp|png)$/);

    const ogImageWidth = await page.getAttribute('meta[property="og:image:width"]', 'content');
    expect(ogImageWidth).toBe('1200');

    const ogImageHeight = await page.getAttribute('meta[property="og:image:height"]', 'content');
    expect(ogImageHeight).toBe('630');

    const ogImageType = await page.getAttribute('meta[property="og:image:type"]', 'content');
    expect(ogImageType).toBe('image/webp');

    const ogImageAlt = await page.getAttribute('meta[property="og:image:alt"]', 'content');
    expect(ogImageAlt).toBeTruthy();
  });

  test('should have og:site_name', async ({ page }) => {
    const ogSiteName = await page.getAttribute('meta[property="og:site_name"]', 'content');
    expect(ogSiteName).toBeTruthy();
  });

  test('should have og:locale', async ({ page }) => {
    const ogLocale = await page.getAttribute('meta[property="og:locale"]', 'content');
    expect(ogLocale).toMatch(OG_LOCALE_PATTERN);
  });

  test('should have profile:* tags', async ({ page }) => {
    const firstName = await page.getAttribute('meta[property="profile:first_name"]', 'content');
    expect(firstName).toBe('Jaecheol');

    const lastName = await page.getAttribute('meta[property="profile:last_name"]', 'content');
    expect(lastName).toBe('Lee');

    const username = await page.getAttribute('meta[property="profile:username"]', 'content');
    expect(username).toBeTruthy();
  });
});

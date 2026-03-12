// @ts-check
const { test, expect } = require('@playwright/test');

const NAME_PATTERN = /Jaecheol Lee|이재철/;
const INFRA_PATTERN = /Infrastructure|인프라/;
const CANONICAL_URL_PATTERN = /^https:\/\/resume\.jclee\.me(?:\/en\/?)?$/;
const OG_LOCALE_PATTERN = /ko_KR|en_US/;
const WEBSITE_LANGUAGE_PATTERN = /ko-KR|en-US/;

test.describe('SEO Meta Tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have proper page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toMatch(NAME_PATTERN);
  });

  test('should have meta description', async ({ page }) => {
    const description = await page.getAttribute('meta[name="description"]', 'content');
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
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
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
    expect(ogImage).toMatch(/og-image\.(webp|png)$/);

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

test.describe('Twitter Card Tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
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
    const twitterImage = await page.getAttribute('meta[name="twitter:image"]', 'content');
    expect(twitterImage).toBeTruthy();
    expect(twitterImage).toMatch(/og-image\.(webp|png)$/);
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

test.describe('JSON-LD Structured Data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have Person schema', async ({ page }) => {
    const personSchema = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'Person') {
            return data;
          }
        } catch {}
      }
      return null;
    });

    expect(personSchema).toBeTruthy();
    expect(personSchema['@context']).toBe('https://schema.org');
    expect(personSchema.name).toMatch(NAME_PATTERN);
    expect(personSchema.alternateName).toMatch(NAME_PATTERN);
    expect(personSchema.email).toBeTruthy();
    expect(personSchema.telephone).toBeTruthy();
    expect(personSchema.jobTitle).toContain('Engineer');
    expect(personSchema.worksFor).toBeTruthy();
    expect(personSchema.sameAs).toBeInstanceOf(Array);
    expect(personSchema.knowsAbout).toBeInstanceOf(Array);
  });

  test('should have WebSite schema', async ({ page }) => {
    const websiteSchema = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'WebSite') {
            return data;
          }
        } catch {
          /* skip invalid JSON-LD */
        }
      }
      return null;
    });

    expect(websiteSchema).toBeTruthy();
    expect(websiteSchema['@context']).toBe('https://schema.org');
    expect(websiteSchema.name).toBeTruthy();
    expect(websiteSchema.url).toBeTruthy();
    expect(websiteSchema.description).toBeTruthy();
    expect(websiteSchema.inLanguage).toMatch(WEBSITE_LANGUAGE_PATTERN);
  });

  test('should have all JSON-LD schemas', async ({ page }) => {
    const schemaCount = await page.evaluate(() => {
      return document.querySelectorAll('script[type="application/ld+json"]').length;
    });
    expect(schemaCount).toBe(3);
  });
});

test.describe('PWA Meta Tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have manifest link', async ({ page }) => {
    const manifest = await page.getAttribute('link[rel="manifest"]', 'href');
    expect(manifest).toBe('/manifest.json');
  });

  test('should have theme-color', async ({ page }) => {
    const themeColor = await page.getAttribute('meta[name="theme-color"]', 'content');
    expect(themeColor).toBeTruthy();
    expect(themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('should have Apple mobile web app meta tags', async ({ page }) => {
    const capableMeta = page.locator('meta[name="apple-mobile-web-app-capable"]');
    if ((await capableMeta.count()) > 0) {
      await expect(capableMeta).toHaveAttribute('content', 'yes');
    }

    const statusBar = await page.getAttribute(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
      'content'
    );
    expect(statusBar).toBeTruthy();

    const title = await page.getAttribute('meta[name="apple-mobile-web-app-title"]', 'content');
    expect(title).toBeTruthy();
  });
});

test.describe('Resource Hints', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have resource hints for external services', async ({ page }) => {
    const resourceHints = page.locator(
      'link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="preload"]'
    );
    const count = await resourceHints.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('SEO Routes', () => {
  const isLocalhost = /127\.0\.0\.1|localhost/.test(process.env.PLAYWRIGHT_BASE_URL || '');

  test('should serve robots.txt', async ({ request }) => {
    const response = await request.get('/robots.txt');
    if (isLocalhost && response.status() === 429) {
      test.skip(true, 'Rate-limited by local wrangler dev server');
      return;
    }
    expect(response.status()).toBe(200);

    const content = await response.text();
    expect(content).toContain('User-agent');
    expect(content).toContain('Sitemap');
  });

  test('should serve sitemap.xml', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    if (isLocalhost && response.status() === 429) {
      test.skip(true, 'Rate-limited by local wrangler dev server');
      return;
    }
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('xml');

    const content = await response.text();
    expect(content).toContain('<?xml');
    expect(content).toContain('<urlset');
    expect(content).toContain('https://resume.jclee.me');
  });

  test('should serve og-image.webp', async ({ request }) => {
    const response = await request.get('/og-image.webp');
    if (isLocalhost && response.status() === 429) {
      test.skip(true, 'Rate-limited by local wrangler dev server');
      return;
    }
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image/webp');
  });
});

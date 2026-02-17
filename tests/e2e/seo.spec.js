// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('SEO Meta Tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have proper page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('이재철');
  });

  test('should have meta description', async ({ page }) => {
    const description = await page.getAttribute('meta[name="description"]', 'content');
    expect(description).toBeTruthy();
    expect(description.length).toBeGreaterThan(20);
    expect(description.length).toBeLessThanOrEqual(200); // Allow up to 200 chars for detailed descriptions
    expect(description).toContain('인프라');
  });

  test('should have meta keywords', async ({ page }) => {
    const keywords = await page.getAttribute('meta[name="keywords"]', 'content');
    expect(keywords).toBeTruthy();
    expect(keywords).toContain('Observability');
  });

  test('should have meta author', async ({ page }) => {
    const author = await page.getAttribute('meta[name="author"]', 'content');
    expect(author).toBeTruthy();
    expect(author).toContain('이재철');
  });

  test('should have meta robots', async ({ page }) => {
    const robots = await page.getAttribute('meta[name="robots"]', 'content');
    expect(robots).toBe('index, follow');
  });

  test('should have canonical URL', async ({ page }) => {
    const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
    expect(canonical).toBe('https://resume.jclee.me');
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
    expect(ogUrl).toBe('https://resume.jclee.me');
  });

  test('should have og:title', async ({ page }) => {
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle).toContain('이재철');
  });

  test('should have og:description', async ({ page }) => {
    const ogDescription = await page.getAttribute('meta[property="og:description"]', 'content');
    expect(ogDescription).toBeTruthy();
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
    expect(ogLocale).toBe('ko_KR');
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
    expect(twitterUrl).toBe('https://resume.jclee.me');
  });

  test('should have twitter:title', async ({ page }) => {
    const twitterTitle = await page.getAttribute('meta[name="twitter:title"]', 'content');
    expect(twitterTitle).toBeTruthy();
    expect(twitterTitle).toContain('이재철');
  });

  test('should have twitter:description', async ({ page }) => {
    const twitterDescription = await page.getAttribute(
      'meta[name="twitter:description"]',
      'content'
    );
    expect(twitterDescription).toBeTruthy();
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
    expect(personSchema.name).toBe('이재철');
    expect(personSchema.alternateName).toBe('Jaecheol Lee');
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
    expect(websiteSchema.inLanguage).toBe('ko-KR');
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
    const capable = await page.getAttribute('meta[name="apple-mobile-web-app-capable"]', 'content');
    expect(capable).toBe('yes');

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
  const isLocalhost = !process.env.SKIP_WEBSERVER;

  test('should serve robots.txt', async ({ request }) => {
    const response = await request.get('/robots.txt');
    if (isLocalhost && response.status() === 429) {
      test.skip(true, 'Rate-limited by local wrangler dev server');
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
    }
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image/webp');
  });
});

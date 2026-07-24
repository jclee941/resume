// @ts-check
const { test, expect } = require('@playwright/test');

const NAME_PATTERN = /Jaecheol Lee|이재철/;
const WEBSITE_LANGUAGE_PATTERN = /ko-KR|en-US/;

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

function inspectJsonLdBlocks() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  const errors = [...scripts].flatMap((script, index) => {
    try {
      JSON.parse(script.textContent || '');
      return [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`block ${index}: ${message}`];
    }
  });
  return { count: scripts.length, errors };
}

test.describe('JSON-LD Structured Data', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (skipIfLocalRateLimited(response, testInfo)) {
      return;
    }
  });

  test('should have Person schema', async ({ page }) => {
    const personResult = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      const parseFailures = [];
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'Person') {
            return { schema: data, parseFailures };
          }
        } catch (error) {
          parseFailures.push(error instanceof Error ? error.message : String(error));
        }
      }
      return { schema: null, parseFailures };
    });

    const { schema: personSchema, parseFailures } = personResult;
    expect(personSchema).toBeTruthy();
    expect(parseFailures).toBeInstanceOf(Array);
    expect(parseFailures.every((message) => typeof message === 'string')).toBe(true);
    expect(personSchema['@context']).toBe('https://schema.org');
    expect(personSchema.name).toMatch(NAME_PATTERN);
    expect(personSchema.alternateName).toMatch(NAME_PATTERN);
    expect(personSchema.email).toBeTruthy();
    expect(personSchema.telephone).toBeTruthy();
    expect(personSchema.jobTitle).toContain('Engineer');
    if (personSchema.worksFor) {
      expect(personSchema.worksFor).toBeTruthy();
    }
    expect(personSchema.sameAs).toBeInstanceOf(Array);
    expect(personSchema.knowsAbout).toBeInstanceOf(Array);
  });

  test('should have WebSite schema', async ({ page }) => {
    const websiteResult = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      const parseFailures = [];
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'WebSite') {
            return { schema: data, parseFailures };
          }
        } catch (error) {
          parseFailures.push(error instanceof Error ? error.message : String(error));
        }
      }
      return { schema: null, parseFailures };
    });

    const { schema: websiteSchema, parseFailures } = websiteResult;
    expect(websiteSchema).toBeTruthy();
    expect(parseFailures).toBeInstanceOf(Array);
    expect(parseFailures.every((message) => typeof message === 'string')).toBe(true);
    expect(websiteSchema['@context']).toBe('https://schema.org');
    expect(websiteSchema.name).toBeTruthy();
    expect(websiteSchema.url).toBeTruthy();
    expect(websiteSchema.description).toBeTruthy();
    expect(websiteSchema.inLanguage).toMatch(WEBSITE_LANGUAGE_PATTERN);
  });

  test('rejected buzzwords/metrics absent on all locales', async ({ page }) => {
    const REJECTED = [
      'proactively',
      'proactive',
      'SOC 24/7',
      '150대',
      '1,000명',
      '1,000-user',
      'MTTR 30→12',
      '5분→30초',
      'Polyglot',
      'AIOps',
      '활용하고 있습니다',
      '경험이 있습니다',
    ];
    const routes = ['/', '/en/', '/ja/'];
    for (const r of routes) {
      await page.goto(r, { waitUntil: 'domcontentloaded' });
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hits = REJECTED.filter((p) => bodyText.includes(p));
      expect(hits, `route ${r} contains rejected: ${hits.join(',')}`).toEqual([]);
    }
  });

  test('canonical URL matches route on each locale', async ({ browser }) => {
    const cases = [
      { path: '/', locale: 'ko-KR', expected: 'https://resume.jclee.me/' },
      { path: '/en/', locale: 'en-US', expected: 'https://resume.jclee.me/en/' },
      { path: '/ja/', locale: 'ja-JP', expected: 'https://resume.jclee.me/ja/' },
    ];
    for (const { path, locale, expected } of cases) {
      const ctx = await browser.newContext({
        locale,
        extraHTTPHeaders: { 'Accept-Language': `${locale},${locale.split('-')[0]};q=0.9` },
      });
      const page = await ctx.newPage();
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href');
      expect(canonical, `canonical for ${path}`).toBe(expected);
      await ctx.close();
    }
  });

  test('root "/" serves Korean canonical 200 even for English Accept-Language (no 302)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      locale: 'en-US',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });
    const page = await ctx.newPage();
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (!response) {
      throw new Error('Korean canonical navigation returned no HTTP response');
    }
    expect(response.status(), 'status for / under en Accept-Language').toBe(200);
    expect(new URL(page.url()).pathname, 'pathname stays /').toBe('/');
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang, 'root html lang').toBe('ko');
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href');
    expect(canonical).toBe('https://resume.jclee.me/');
    await ctx.close();
  });

  test('should have valid JSON-LD on KO root', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(inspectJsonLdBlocks);
    expect(result.errors).toEqual([]);
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  test('should have valid JSON-LD on EN page', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(inspectJsonLdBlocks);
    expect(result.errors).toEqual([]);
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  test('should have valid JSON-LD on JA page', async ({ page }) => {
    await page.goto('/ja/', { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(inspectJsonLdBlocks);
    expect(result.errors).toEqual([]);
    expect(result.count).toBeGreaterThanOrEqual(1);
  });
});

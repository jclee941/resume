// @ts-check
const { test, expect } = require('@playwright/test');

const configuredBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL || (process.env.CI ? 'http://localhost:8787' : '');
const isLocalhost = /127\.0\.0\.1|localhost/.test(configuredBaseUrl);

test.describe('SEO Routes', () => {
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

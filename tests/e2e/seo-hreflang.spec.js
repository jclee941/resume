const { test, expect } = require('@playwright/test');
const resumeData = require('../../packages/data/resumes/master/resume_data.json');

const KOREAN_CANONICAL = 'https://resume.jclee.me/ko/';
const PREVIOUS_SITEMAP_ETAG = 'W/"resume-sitemap-20260630"';
const CURRENT_SITEMAP_ETAG = 'W/"resume-sitemap-20260720"';
const CURRENT_LAST_MODIFIED = 'Mon, 20 Jul 2026 00:00:00 GMT';

test.describe('SEO hreflang canonical alignment', () => {
  test('locale pages advertise /ko/ as the Korean alternate', async ({ page }) => {
    for (const path of ['/', '/ko/', '/en/', '/ja/']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const koreanAlternate = await page
        .locator('link[rel="alternate"][hreflang="ko-KR"]')
        .first()
        .getAttribute('href');

      expect(koreanAlternate, `ko-KR alternate for ${path}`).toBe(KOREAN_CANONICAL);
    }
  });

  test('sitemap hreflang uses /ko/ for the Korean alternate', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);

    const xml = await response.text();
    expect(response.headers()['etag']).toBe(CURRENT_SITEMAP_ETAG);
    expect(response.headers()['last-modified']).toBe(CURRENT_LAST_MODIFIED);
    expect(xml).toContain(`<loc>${KOREAN_CANONICAL}</loc>`);
    expect(xml).toContain(`hreflang="ko-KR" href="${KOREAN_CANONICAL}"`);
    expect(xml).not.toContain('hreflang="ko-KR" href="https://resume.jclee.me/"');
  });

  test('sitemap cache validators reject the pre-/ko/ ETag', async ({ request }) => {
    const staleResponse = await request.get('/sitemap.xml', {
      headers: { 'If-None-Match': PREVIOUS_SITEMAP_ETAG },
    });
    expect(staleResponse.status()).toBe(200);
    expect(staleResponse.headers()['etag']).toBe(CURRENT_SITEMAP_ETAG);

    const freshResponse = await request.get('/sitemap.xml', {
      headers: { 'If-None-Match': CURRENT_SITEMAP_ETAG },
    });
    expect(freshResponse.status()).toBe(304);
  });

  test('sitemap cache validators honor current Last-Modified', async ({ request }) => {
    const staleResponse = await request.get('/sitemap.xml', {
      headers: { 'If-Modified-Since': 'Fri, 05 Jun 2026 00:00:00 GMT' },
    });
    expect(staleResponse.status()).toBe(200);
    expect(staleResponse.headers()['last-modified']).toBe(CURRENT_LAST_MODIFIED);

    const freshResponse = await request.get('/sitemap.xml', {
      headers: { 'If-Modified-Since': CURRENT_LAST_MODIFIED },
    });
    expect(freshResponse.status()).toBe(304);
  });

  test('Korean route canonical and JSON-LD profile schema stay aligned', async ({ page }) => {
    await page.goto('/ko/', { waitUntil: 'domcontentloaded' });

    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href');
    expect(canonical).toBe(KOREAN_CANONICAL);

    const counts = await page.evaluate(() => {
      const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
      let creativeWork = 0;
      const types = new Set();
      const parseJsonLd = (el) => {
        try {
          return JSON.parse(el.textContent || '');
        } catch {
          return null;
        }
      };
      for (const el of blocks) {
        const item = parseJsonLd(el);
        if (!item) continue;
        if (item['@type'] === 'CreativeWork') creativeWork += 1;
        else if (item['@type']) types.add(item['@type']);
      }
      return { total: blocks.length, creativeWork, types: [...types] };
    });

    expect(counts.total).toBe(resumeData.personalProjects.length + 4);
    expect(counts.creativeWork).toBe(resumeData.personalProjects.length);
    expect(counts.types).toEqual(
      expect.arrayContaining(['Person', 'ProfilePage', 'WebSite', 'BreadcrumbList'])
    );
  });
});

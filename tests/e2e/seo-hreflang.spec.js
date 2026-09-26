const { test, expect } = require('@playwright/test');
const resumeData = require('../../packages/data/resumes/master/resume_data.json');

const KOREAN_CANONICAL = 'https://resume.jclee.me/ko/';
const PREVIOUS_SITEMAP_ETAG = 'W/"resume-sitemap-20260630"';

async function currentSitemapValidators(request) {
  const response = await request.get('/sitemap.xml');
  return { etag: response.headers()['etag'], lastModified: response.headers()['last-modified'] };
}

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
    const lastmod = xml.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1];
    expect(lastmod).toBeTruthy();
    expect(response.headers()['etag']).toBe(`W/"resume-sitemap-${lastmod.replace(/-/g, '')}"`);
    expect(new Date(response.headers()['last-modified']).toISOString().slice(0, 10)).toBe(lastmod);
    expect(xml).toContain(`<loc>${KOREAN_CANONICAL}</loc>`);
    expect(xml).toContain(`hreflang="ko-KR" href="${KOREAN_CANONICAL}"`);
    expect(xml).not.toContain('hreflang="ko-KR" href="https://resume.jclee.me/"');
  });

  test('sitemap cache validators reject the pre-/ko/ ETag', async ({ request }) => {
    const { etag } = await currentSitemapValidators(request);
    const staleResponse = await request.get('/sitemap.xml', {
      headers: { 'If-None-Match': PREVIOUS_SITEMAP_ETAG },
    });
    expect(staleResponse.status()).toBe(200);
    expect(staleResponse.headers()['etag']).toBe(etag);

    const freshResponse = await request.get('/sitemap.xml', {
      headers: { 'If-None-Match': etag },
    });
    expect(freshResponse.status()).toBe(304);
  });

  test('sitemap cache validators honor current Last-Modified', async ({ request }) => {
    const { lastModified } = await currentSitemapValidators(request);
    const staleResponse = await request.get('/sitemap.xml', {
      headers: { 'If-Modified-Since': 'Fri, 05 Jun 2026 00:00:00 GMT' },
    });
    expect(staleResponse.status()).toBe(200);
    expect(staleResponse.headers()['last-modified']).toBe(lastModified);

    const freshResponse = await request.get('/sitemap.xml', {
      headers: { 'If-Modified-Since': lastModified },
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

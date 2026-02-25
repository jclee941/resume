const path = require('path');
const fs = require('fs');

function loadEntryRouterUtils() {
  const modulePath = path.resolve(
    __dirname,
    '../../../../typescript/portfolio-worker/lib/entry-router-utils.js'
  );
  const source = fs.readFileSync(modulePath, 'utf8');

  const transformedSource = source
    .replace(/^export\s+const\s+/gm, 'const ')
    .replace(/\nexport\s*\{[\s\S]*?\}\s*;?\s*$/m, '\n');

  const module = { exports: {} };
  const factory = new Function(
    'module',
    'exports',
    'Request',
    'Response',
    'Headers',
    'URL',
    `${transformedSource}
module.exports = {
  LAST_MODIFIED,
  SITEMAP_ETAG,
  DEFAULT_LANGUAGE,
  JOB_ROUTE_PREFIX,
  LOCALE_ROUTES,
  SITEMAP_XML,
  detectRequestLanguage,
  getPortfolioTargetPath,
  isHtmlResponse,
  localizeHtmlResponse,
  applyResponseHeaders,
  createSingleWorkerProfileSyncRequest,
  createSingleWorkerProfileSyncStatusRequest,
  isSingleWorkerProfileSyncTrigger,
  getSingleWorkerProfileSyncStatusId,
};`
  );

  factory(module, module.exports, Request, Response, Headers, URL);
  return module.exports;
}

describe('entry-router-utils', () => {
  let utils;

  beforeAll(() => {
    utils = loadEntryRouterUtils();
  });

  describe('detectRequestLanguage', () => {
    test('prefers language from path', () => {
      const request = new Request('https://resume.jclee.me/en/', {
        headers: { 'Accept-Language': 'ja,en;q=0.8' },
      });

      expect(utils.detectRequestLanguage(request, '/en/')).toEqual({
        language: 'en',
        source: 'path',
      });
    });

    test('uses Accept-Language ranking when path has no locale', () => {
      const request = new Request('https://resume.jclee.me/', {
        headers: { 'Accept-Language': 'en-US;q=0.5,ja;q=1.0,ko;q=0.8' },
      });

      expect(utils.detectRequestLanguage(request, '/')).toEqual({
        language: 'ja',
        source: 'accept-language',
      });
    });

    test('falls back to default when no supported language is present', () => {
      const request = new Request('https://resume.jclee.me/', {
        headers: { 'Accept-Language': 'fr;q=0,es;q=0' },
      });

      expect(utils.detectRequestLanguage(request, '/')).toEqual({
        language: 'ko',
        source: 'default',
      });
    });

    test('falls back to default when header is missing', () => {
      const request = new Request('https://resume.jclee.me/');

      expect(utils.detectRequestLanguage(request, '/')).toEqual({
        language: 'ko',
        source: 'default',
      });
    });
  });

  describe('getPortfolioTargetPath', () => {
    test('normalizes locale roots', () => {
      expect(utils.getPortfolioTargetPath('/en', 'en')).toBe('/en/');
      expect(utils.getPortfolioTargetPath('/en/', 'en')).toBe('/en/');
      expect(utils.getPortfolioTargetPath('/ko', 'ko')).toBe('/');
      expect(utils.getPortfolioTargetPath('/ja/', 'ja')).toBe('/');
    });

    test('routes root by detected language', () => {
      expect(utils.getPortfolioTargetPath('/', 'en')).toBe('/en/');
      expect(utils.getPortfolioTargetPath('/', 'ko')).toBe('/');
    });

    test('returns original path for non-root routes', () => {
      expect(utils.getPortfolioTargetPath('/projects', 'en')).toBe('/projects');
    });
  });

  describe('response localization and headers', () => {
    test('detects HTML response content type', () => {
      const htmlResponse = new Response('<html></html>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
      const jsonResponse = new Response('{"ok":true}', {
        headers: { 'Content-Type': 'application/json' },
      });

      expect(utils.isHtmlResponse(htmlResponse)).toBe(true);
      expect(utils.isHtmlResponse(jsonResponse)).toBe(false);
    });

    test('localizes html and injects hreflang links into head', async () => {
      const response = new Response('<html lang="ko"><head></head><body>Hello</body></html>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });

      const localized = await utils.localizeHtmlResponse(response, 'ja');
      const text = await localized.text();

      expect(text).toContain('<html lang="ja">');
      expect(text).toContain('hreflang="ko-KR"');
      expect(text).toContain('hreflang="en-US"');
      expect(text).toContain('hreflang="ja-JP"');
      expect(text).toContain('hreflang="x-default"');
    });

    test('localizes html without head and strips alternate links', async () => {
      const response = new Response(
        '<html><body><link rel="alternate" hreflang="fr" href="https://x" />No head</body></html>',
        {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );

      const localized = await utils.localizeHtmlResponse(response, 'en');
      const text = await localized.text();

      expect(text).toContain('<html lang="en">');
      expect(text).not.toContain('hreflang="fr"');
    });

    test('applies cache, vary, language, last-modified and etag headers', async () => {
      const response = new Response('ok', {
        headers: {
          Vary: 'Accept-Encoding',
        },
      });

      const wrapped = utils.applyResponseHeaders(response, '/health', {
        language: 'en',
        source: 'path',
        varyAcceptLanguage: true,
      });

      expect(wrapped.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(wrapped.headers.get('Vary')).toContain('Accept-Encoding');
      expect(wrapped.headers.get('Vary')).toContain('Accept-Language');
      expect(wrapped.headers.get('X-Detected-Language')).toBe('en');
      expect(wrapped.headers.get('X-Language-Source')).toBe('path');
      expect(wrapped.headers.get('Last-Modified')).toBe('Sun, 15 Feb 2026 00:00:00 GMT');
      expect(wrapped.headers.get('ETag')).toMatch(/^W\/".*-2026-02-15"$/);
    });

    test('preserves existing Last-Modified and ETag headers', () => {
      const response = new Response('ok', {
        headers: {
          'Last-Modified': 'Mon, 01 Jan 2001 00:00:00 GMT',
          ETag: 'W/"custom"',
        },
      });

      const wrapped = utils.applyResponseHeaders(response, '/api/automation/profile-sync');

      expect(wrapped.headers.get('Last-Modified')).toBe('Mon, 01 Jan 2001 00:00:00 GMT');
      expect(wrapped.headers.get('ETag')).toBe('W/"custom"');
      expect(wrapped.headers.get('Cache-Control')).toBe('no-store');
    });

    test('applies static and document cache branches', () => {
      const base = new Response('ok');

      const hashedAsset = utils.applyResponseHeaders(base, '/assets/main.abcdef12.js');
      expect(hashedAsset.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');

      const plainAsset = utils.applyResponseHeaders(base, '/assets/main.js');
      expect(plainAsset.headers.get('Cache-Control')).toBe(
        'public, max-age=86400, must-revalidate'
      );

      const documentAsset = utils.applyResponseHeaders(base, '/resume.pdf');
      expect(documentAsset.headers.get('Cache-Control')).toBe(
        'public, max-age=86400, must-revalidate'
      );

      const fallback = utils.applyResponseHeaders(base, '/projects');
      expect(fallback.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
    });
  });

  describe('single-worker profile sync aliases', () => {
    test('builds profile-sync request with default platforms when input is invalid', async () => {
      const request = new Request('https://resume.jclee.me/api/automation/resume-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid-json',
      });

      const proxied = await utils.createSingleWorkerProfileSyncRequest(request);
      const body = await proxied.json();

      expect(proxied.method).toBe('POST');
      expect(new URL(proxied.url).pathname).toBe('/api/automation/profile-sync');
      expect(body.platforms).toEqual(['wanted', 'jobkorea']);
      expect(proxied.headers.get('Content-Type')).toBe('application/json');
    });

    test('preserves explicit platforms when provided', async () => {
      const request = new Request('https://resume.jclee.me/api/automation/resume-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: ['wanted'], force: true }),
      });

      const proxied = await utils.createSingleWorkerProfileSyncRequest(request);
      const body = await proxied.json();

      expect(body.platforms).toEqual(['wanted']);
      expect(body.force).toBe(true);
    });

    test('creates status request and trigger helpers work as expected', () => {
      const request = new Request('https://resume.jclee.me/api/automation/resume-update/abc123', {
        method: 'GET',
      });

      const statusReq = utils.createSingleWorkerProfileSyncStatusRequest(request, 'abc123');
      expect(statusReq.method).toBe('GET');
      expect(new URL(statusReq.url).pathname).toBe('/api/automation/profile-sync/abc123');

      expect(utils.isSingleWorkerProfileSyncTrigger('/api/automation/resume-update', 'POST')).toBe(
        true
      );
      expect(utils.isSingleWorkerProfileSyncTrigger('/api/automation/resume-update', 'GET')).toBe(
        false
      );

      expect(
        utils.getSingleWorkerProfileSyncStatusId('/api/automation/resume-update/abc123', 'GET')
      ).toBe('abc123');
      expect(
        utils.getSingleWorkerProfileSyncStatusId('/api/automation/resume-update/abc123', 'POST')
      ).toBeNull();
      expect(
        utils.getSingleWorkerProfileSyncStatusId('/api/automation/resume-update', 'GET')
      ).toBeNull();
    });
  });

  describe('constants', () => {
    test('exposes expected constants used by router', () => {
      expect(utils.DEFAULT_LANGUAGE).toBe('ko');
      expect(utils.JOB_ROUTE_PREFIX).toBe('/job');
      expect(utils.LAST_MODIFIED).toBe('Sun, 15 Feb 2026 00:00:00 GMT');
      expect(utils.SITEMAP_ETAG).toBe('W/"resume-sitemap-2026-02-15"');
      expect(utils.LOCALE_ROUTES.has('/')).toBe(true);
      expect(utils.LOCALE_ROUTES.has('/en')).toBe(true);
      expect(utils.SITEMAP_XML).toContain('<urlset');
      expect(utils.SITEMAP_XML).toContain('<loc>https://resume.jclee.me/</loc>');
    });
  });
});

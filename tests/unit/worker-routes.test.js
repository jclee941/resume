'use strict';

const {
  generateFetchAndRateLimit,
  generatePageRoutes,
  generateStaticRoutes,
  generateHealthRoute,
  generateMetricsRoute,
  generateSeoRoutes,
  generate404,
  generateFaviconRedirect,
  generateErrorHandler,
} = require('../../apps/portfolio/lib/worker-routes');
const { ownerIdentity } = require('../helpers/owner-data');
const fs = require('fs');
const path = require('path');
const {
  generateSecurityHeaders,
  getCacheHeaders,
} = require('../../apps/portfolio/lib/security-headers');
const { applyJapaneseMeta } = require('../../apps/portfolio/lib/japanese-template/meta');
const { copySocialImages } = require('../../apps/portfolio/lib/build-static-assets');

function loadSeoHelpers() {
  const source = ['constants.js', 'routing-helpers.js', 'html-localization.js']
    .map((file) =>
      fs.readFileSync(
        path.resolve(__dirname, '../../apps/portfolio/lib/entry-router-utils', file),
        'utf8'
      )
    )
    .join('\n')
    .replace(/^import\s+[\s\S]*?from\s+['"].*?['"];\n?/gm, '')
    .replace(/^export\s*\{[\s\S]*?\};\n?/gm, '');
  return new Function(
    `const CONTENT_LASTMOD = '2026-10-14'; ${source}
     return { SITEMAP_XML, getPortfolioTargetPath, localizeHtmlDocument };`
  )();
}

function runRoute(code, request, env = {}) {
  return new Function(
    'request',
    'env',
    'SECURITY_HEADERS',
    'CACHE_POLICIES',
    `return (async () => {
      const url = new URL(request.url);
      const metrics = { requests_success: 0, requests_error: 0 };
      const rateLimitHeaders = { 'X-RateLimit-Limit': '120' };
      const applyNonceToHeaders = headers => headers;
      ${code}
      return null;
    })();`
  )(request, env, generateSecurityHeaders([]), {
    static: getCacheHeaders('STATIC'),
    api: getCacheHeaders('API'),
  });
}

describe('Worker Routes', () => {
  it('copies exactly the three social PNGs to the private static asset directory', () => {
    const mkdir = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    const copy = jest.spyOn(fs, 'copyFileSync').mockImplementation(() => undefined);
    try {
      copySocialImages('/portfolio');
      expect(mkdir).toHaveBeenCalledWith('/portfolio/assets/social', { recursive: true });
      expect(copy.mock.calls).toEqual(
        ['og-image.png', 'og-image-en.png', 'og-image-ja.png'].map((filename) => [
          `/portfolio/${filename}`,
          `/portfolio/assets/social/${filename}`,
        ])
      );
    } finally {
      copy.mockRestore();
      mkdir.mockRestore();
    }
  });

  describe('generateFetchAndRateLimit', () => {
    let code;
    beforeAll(() => {
      code = generateFetchAndRateLimit();
    });

    it('should return a non-empty string', () => {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });

    it('should contain export default with fetch handler', () => {
      expect(code).toContain('export default');
      expect(code).toMatch(/async\s+fetch\s*\(\s*request/);
    });

    it('should contain rate limiting logic', () => {
      expect(code).toContain('checkRateLimit');
      expect(code).toContain('getRateLimitHeaders');
    });

    it('should contain CORS handling', () => {
      expect(code).toContain('getCorsHeaders');
    });

    it('should contain 429 Too Many Requests response', () => {
      expect(code).toContain('429');
      expect(code).toContain('Too Many Requests');
    });

    it('should contain URL parsing', () => {
      expect(code).toContain('new URL');
      expect(code).toContain('pathname');
    });

    it('should handle preflight responses', () => {
      expect(code).toContain('preflightResponse');
    });

    it('bypasses rate limiting only for the exact local environment (fail-closed)', () => {
      // Local bypass must key on an explicit trusted signal (env.ENVIRONMENT), never the
      // request hostname or a missing client IP, and must fail closed for production,
      // preview, or any unset/misspelled value.
      expect(code).toMatch(/ENVIRONMENT\s*===\s*['"]local['"]/);
      expect(code).not.toContain('isLocalDevHost');
      expect(code).not.toMatch(/ENVIRONMENT\s*!==\s*['"]production['"]/);
      expect(code).not.toMatch(/clientIp\s*===\s*['"]unknown['"]/);
    });
  });

  describe('generatePageRoutes', () => {
    let code;
    beforeAll(() => {
      code = generatePageRoutes();
    });

    it('should return a non-empty string', () => {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });

    it('should contain root route with INDEX_HTML', () => {
      expect(code).toContain('INDEX_HTML');
    });

    it('should contain English route with INDEX_EN_HTML', () => {
      expect(code).toContain('/en');
      expect(code).toContain('INDEX_EN_HTML');
    });

    it('should contain SECURITY_HEADERS', () => {
      expect(code).toContain('SECURITY_HEADERS');
    });

    it('should contain CACHE_POLICIES', () => {
      expect(code).toContain('CACHE_POLICIES');
    });

    it('should contain /assets/ route handling', () => {
      expect(code).toContain('/assets/');
    });

    it('should not reference Elasticsearch logging', () => {
      expect(code).not.toContain('logToElasticsearch');
    });

    it.each([
      ['GET', '/ko'],
      ['GET', '/ko/'],
      ['HEAD', '/ko'],
      ['HEAD', '/ko/'],
    ])('redirects %s %s to the Korean canonical with its query', async (method, pathname) => {
      const { getPortfolioTargetPath } = loadSeoHelpers();
      const url = new URL(`https://example.com${pathname}?source=a%2Fb&lang=ko`);
      url.pathname = getPortfolioTargetPath(url.pathname, 'ko');
      const response = await runRoute(code, new Request(url, { method }));
      expect(response.status).toBe(301);
      expect(response.headers.get('Location')).toBe('/?source=a%2Fb&lang=ko');
      expect(await response.text()).toBe('');
    });

    it('does not redirect unsafe methods from a Korean alias', async () => {
      expect(
        await runRoute(code, new Request('https://example.com/ko/', { method: 'POST' }))
      ).toBeNull();
    });
  });

  describe('canonical language discovery', () => {
    it('uses only the three canonical pages in both sitemap sources', () => {
      const { SITEMAP_XML } = loadSeoHelpers();
      const staticSitemap = fs.readFileSync(
        path.resolve(__dirname, '../../apps/portfolio/sitemap.xml'),
        'utf8'
      );
      for (const xml of [SITEMAP_XML, staticSitemap]) {
        expect([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])).toEqual([
          'https://resume.jclee.me/',
          'https://resume.jclee.me/en/',
          'https://resume.jclee.me/ja/',
        ]);
        for (const language of ['ko-KR', 'x-default']) {
          const alternates = [
            ...xml.matchAll(new RegExp(`hreflang="${language}" href="([^"]+)"`, 'g')),
          ];
          expect(alternates).toHaveLength(3);
          expect(alternates.map((match) => match[1])).toEqual(
            Array(3).fill('https://resume.jclee.me/')
          );
        }
      }
    });

    it.each(['/', '/ko', '/ko/'])(
      'points Korean canonical and alternates at root for %s',
      (route) => {
        const { localizeHtmlDocument } = loadSeoHelpers();
        const html = localizeHtmlDocument(
          '<html><head><link rel="canonical" href="https://example.com/old" /></head></html>',
          'ko',
          route
        );
        expect(html.match(/rel="canonical" href="([^"]+)"/)[1]).toBe('https://resume.jclee.me/');
        expect(html.match(/hreflang="ko-KR" href="([^"]+)"/)[1]).toBe('https://resume.jclee.me/');
        expect(html.match(/hreflang="x-default" href="([^"]+)"/)[1]).toBe(
          'https://resume.jclee.me/'
        );
      }
    );
  });

  describe('Japanese social metadata', () => {
    it.each(['png', 'webp'])('localizes images and descriptions from the %s shell', (extension) => {
      const identity = { nameKo: 'Example', nameJa: 'サンプル', nameEn: 'Example', email: '' };
      const html = applyJapaneseMeta(
        `<html lang="ko"><head><title>Example</title>
          <meta name="description" content="old" />
          <meta property="og:description" content="old" />
          <meta name="twitter:description" content="old" />
          <meta property="og:image" content="https://resume.jclee.me/og-image.${extension}" />
          <meta name="twitter:image" content="https://resume.jclee.me/og-image.${extension}" />
          <meta property="og:image:type" content="image/${extension}" />
        </head></html>`,
        identity
      );
      const meta = Object.fromEntries(
        [...html.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]+)" \/>/g)].map(
          (match) => [match[1], match[2]]
        )
      );
      const description = `${identity.nameJa} — Security & Infrastructure Engineer ポートフォリオ。FortiGate HA、Splunk ES、FortiManager API、金融系セキュリティ基盤、SIEM検知・通知自動化の経験。`;
      expect(meta.description).toBe(description);
      expect(meta['og:description']).toBe(description);
      expect(meta['twitter:description']).toBe(description);
      expect(meta['og:image']).toBe('https://resume.jclee.me/og-image-ja.png');
      expect(meta['twitter:image']).toBe(meta['og:image']);
      expect(meta['og:image:type']).toBe('image/png');
    });
  });

  describe('generateStaticRoutes', () => {
    let code;
    beforeAll(() => {
      code = generateStaticRoutes();
    });

    it('should return a non-empty string', () => {
      expect(typeof code).toBe('string');
    });

    it('should contain /manifest.json route with correct content type', () => {
      expect(code).toContain('/manifest.json');
      expect(code).toContain('application/json');
    });

    it('should contain /sw.js route with Service-Worker-Allowed', () => {
      expect(code).toContain('/sw.js');
      expect(code).toContain('application/javascript');
      expect(code).toContain('Service-Worker-Allowed');
    });

    it('should contain /main.js route', () => {
      expect(code).toContain('/main.js');
    });

    it('should contain locale resume data routes', () => {
      expect(code).toContain('/resume-data.json');
      expect(code).toContain('/en/resume-data.json');
      expect(code).toContain('/ja/resume-data.json');
      expect(code).toContain('RESUME_DATA_EN_JSON');
      expect(code).toContain('RESUME_DATA_JA_JSON');
    });
  });

  describe('generateHealthRoute', () => {
    const opts = { version: '1.0.0', deployedAt: '2024-01-01T00:00:00Z' };
    let code;
    beforeAll(() => {
      code = generateHealthRoute(opts);
    });

    it('should return a non-empty string', () => {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });

    it('should contain /health path check', () => {
      expect(code).toContain('/health');
    });

    it('should interpolate version and deployedAt', () => {
      expect(code).toContain('1.0.0');
      expect(code).toContain('2024-01-01T00:00:00Z');
    });

    it('probes the JOB_DB binding and never the retired DB binding', () => {
      expect(code).toContain('env.JOB_DB.prepare');
      expect(code).not.toContain('env.DB');
    });

    it('should contain KV health check', () => {
      expect(code).toContain('env.SESSIONS');
    });

    it('should contain healthy and degraded statuses', () => {
      expect(code).toContain('healthy');
      expect(code).toContain('degraded');
    });

    it('exposes a sanitized public /api/status route', () => {
      expect(code).toContain('/api/status');
    });

    describe('/api/status execution (sanitized public payload)', () => {
      async function runStatus(dbThrows, kvThrows) {
        const fn = new Function(
          'url',
          'env',
          'metrics',
          'applyNonceToHeaders',
          'SECURITY_HEADERS',
          'rateLimitHeaders',
          'CACHE_POLICIES',
          'Response',
          `return (async () => {${code}\n return null;})();`
        );
        const env = {
          JOB_DB: {
            prepare: () => ({
              first: async () => {
                if (dbThrows) throw new Error('db boom');
                return { ok: 1 };
              },
            }),
          },
          SESSIONS: {
            get: async () => {
              if (kvThrows) throw new Error('kv boom');
              return '1';
            },
          },
        };
        let captured = null;
        const ResponseShim = function (body) {
          captured = body;
        };
        await fn(
          { pathname: '/api/status' },
          env,
          { worker_start_time: Date.now(), requests_success: 0 },
          (h) => h,
          {},
          {},
          { api: {} },
          ResponseShim
        );
        return captured ? JSON.parse(captured) : null;
      }

      it('returns only sanitized fields, never raw telemetry', async () => {
        const body = await runStatus(false, false);
        expect(body).not.toBeNull();
        expect(body.status).toBe('healthy');
        expect(body.bindings.d1.healthy).toBe(true);
        expect(body.bindings.kv.healthy).toBe(true);
        expect(typeof body.version).toBe('string');
        // Raw telemetry must NOT be in the public payload.
        expect(body).not.toHaveProperty('uptime_seconds');
        expect(body).not.toHaveProperty('metrics');
        expect(body.bindings.d1).not.toHaveProperty('latency_ms');
        expect(body.bindings.d1).not.toHaveProperty('error');
      });

      it('reports degraded without leaking error messages on binding failure', async () => {
        const body = await runStatus(true, false);
        expect(body.status).toBe('degraded');
        expect(body.bindings.d1.healthy).toBe(false);
        expect(JSON.stringify(body)).not.toContain('boom');
      });
    });
  });

  describe('generateMetricsRoute', () => {
    let code;
    beforeAll(() => {
      code = generateMetricsRoute();
    });

    it('should return a non-empty string', () => {
      expect(typeof code).toBe('string');
    });

    it('should contain /metrics path', () => {
      expect(code).toContain('/metrics');
    });

    it('should contain generateMetrics call', () => {
      expect(code).toContain('generateMetrics');
    });

    it('should return text/plain content type', () => {
      expect(code).toContain('text/plain');
    });
  });

  describe('generateSeoRoutes', () => {
    let code;
    beforeAll(() => {
      code = generateSeoRoutes();
    });

    it('should return a non-empty string', () => {
      expect(typeof code).toBe('string');
    });

    it('should contain /robots.txt route with text/plain', () => {
      expect(code).toContain('/robots.txt');
      expect(code).toContain('text/plain');
    });

    it('should contain /sitemap.xml route with application/xml', () => {
      expect(code).toContain('/sitemap.xml');
      expect(code).toContain('application/xml');
    });

    it('should contain OG image routes with image/webp', () => {
      expect(code).toContain('/og-image.webp');
      expect(code).toContain('/og-image-en.webp');
      expect(code).toContain('image/webp');
    });

    it('should serve summary and full CV PDFs from the assets binding (no inline base64)', () => {
      expect(code).toContain('/resume.pdf');
      expect(code).toContain('/resume-full.pdf');
      expect(code).toContain('application/pdf');
      expect(code).toContain('Content-Disposition');
      // PDF is no longer inlined: route must read from env.ASSETS, not atob a const.
      expect(code).toContain('env.ASSETS');
      expect(code).not.toContain('RESUME_PDF_BASE64');
      // Must have a 404 fallback when the asset is unavailable.
      expect(code).toContain('Resume PDF not found');
    });

    it('should serve a richer RFC 9116 security.txt (Contact + Hiring + dynamic Expires)', () => {
      expect(code).toContain('/.well-known/security.txt');
      expect(code).toContain(`Contact: mailto:${ownerIdentity('ko').email}`);
      expect(code).toContain('Hiring:');
      expect(code).toContain('Expires:');
      expect(code).toContain('Preferred-Languages: ko, en');
    });

    describe('/resume.pdf route execution (mocked env.ASSETS)', () => {
      // Wrap the generated route fragment in an executable handler so we test
      // real runtime behaviour, not just the generated source string.
      function buildHandler() {
        const body = `
          return (async () => {
            ${generateSeoRoutes()}
            return new Response('no-match', { status: 418 });
          })();`;
        return new Function(
          'url',
          'request',
          'env',
          'metrics',
          'rateLimitHeaders',
          'SECURITY_HEADERS',
          'CACHE_POLICIES',
          'applyNonceToHeaders',
          'Response',
          'Request',
          'URL',
          'Headers',
          body
        );
      }

      const baseDeps = () => ({
        metrics: { requests_success: 0, requests_error: 0 },
        rateLimitHeaders: {},
        SECURITY_HEADERS: {},
        CACHE_POLICIES: { static: {} },
        applyNonceToHeaders: (h) => h,
      });

      it('serves the asset as application/pdf with Content-Disposition on success', async () => {
        const handler = buildHandler();
        const deps = baseDeps();
        const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
        const env = {
          ASSETS: {
            fetch: async () =>
              new Response(pdfBytes, {
                status: 200,
                headers: { 'Content-Type': 'application/octet-stream' },
              }),
          },
        };
        const res = await handler(
          new URL('https://example.com/resume.pdf'),
          new Request('https://example.com/resume.pdf'),
          env,
          deps.metrics,
          deps.rateLimitHeaders,
          deps.SECURITY_HEADERS,
          deps.CACHE_POLICIES,
          deps.applyNonceToHeaders,
          Response,
          Request,
          URL,
          Headers
        );
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('application/pdf');
        expect(res.headers.get('Content-Disposition')).toMatch(/filename="resume_[^"]+\.pdf"/);
        expect(deps.metrics.requests_success).toBe(1);
        const buf = new Uint8Array(await res.arrayBuffer());
        expect(Array.from(buf.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]);
      });

      it('returns 404 when the asset is missing', async () => {
        const handler = buildHandler();
        const deps = baseDeps();
        const env = {
          ASSETS: { fetch: async () => new Response('not found', { status: 404 }) },
        };
        const res = await handler(
          new URL('https://example.com/resume.pdf'),
          new Request('https://example.com/resume.pdf'),
          env,
          deps.metrics,
          deps.rateLimitHeaders,
          deps.SECURITY_HEADERS,
          deps.CACHE_POLICIES,
          deps.applyNonceToHeaders,
          Response,
          Request,
          URL,
          Headers
        );
        expect(res.status).toBe(404);
        expect(deps.metrics.requests_error).toBe(1);
      });

      it('returns 404 when env.ASSETS binding is absent', async () => {
        const handler = buildHandler();
        const deps = baseDeps();
        const res = await handler(
          new URL('https://example.com/resume.pdf'),
          new Request('https://example.com/resume.pdf'),
          {},
          deps.metrics,
          deps.rateLimitHeaders,
          deps.SECURITY_HEADERS,
          deps.CACHE_POLICIES,
          deps.applyNonceToHeaders,
          Response,
          Request,
          URL,
          Headers
        );
        expect(res.status).toBe(404);
      });
    });

    it('should still base64-decode the OG image binary routes', () => {
      expect(code).toContain('atob');
      expect(code).toContain('OG_IMAGE_BASE64');
    });

    it.each(['og-image.png', 'og-image-en.png', 'og-image-ja.png'])(
      'serves %s bytes through ASSETS with the WebP cache policy',
      async (filename) => {
        const bytes = fs.readFileSync(path.resolve(__dirname, '../../apps/portfolio', filename));
        const fetch = jest.fn(async () => new Response(bytes));
        const response = await runRoute(code, new Request(`https://example.com/${filename}`), {
          ASSETS: { fetch },
        });
        expect(new URL(fetch.mock.calls[0][0].url).pathname).toBe(`/social/${filename}`);
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('image/png');
        expect(response.headers.get('Cache-Control')).toBe(
          getCacheHeaders('STATIC')['Cache-Control']
        );
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
      }
    );

    it.each([{}, { ASSETS: { fetch: async () => new Response('Not Found', { status: 404 }) } }])(
      'preserves a plain-text miss when PNG assets are unavailable',
      async (env) => {
        const response = await runRoute(code, new Request('https://example.com/og-image.png'), env);
        expect(response.status).toBe(404);
        expect(response.headers.get('Content-Type')).toBe('text/plain');
        expect(await response.text()).toBe('Not Found');
      }
    );
  });

  describe('generate404', () => {
    let code;
    beforeAll(() => {
      code = generate404();
    });

    it('should return a non-empty string', () => {
      expect(typeof code).toBe('string');
    });

    it('should contain 404 status', () => {
      expect(code).toContain('404');
    });

    it('should contain Not Found message', () => {
      expect(code).toContain('Not Found');
    });

    it('returns a noindex multilingual HTML page with security headers', async () => {
      const response = await runRoute(code, new Request('https://example.com/missing-page'));
      const html = await response.text();
      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Content-Security-Policy')).toBe(
        generateSecurityHeaders([])['Content-Security-Policy']
      );
      expect(html).toMatch(/^<!doctype html>/);
      expect(html).toContain('<html lang="ko">');
      expect(html).toContain('<meta name="robots" content="noindex">');
      expect(html).toContain('<meta name="color-scheme" content="dark">');
      expect(html).toContain('<h1>404</h1>');
      expect([...html.matchAll(/<a href="([^"]+)"/g)].map((match) => match[1])).toEqual([
        '/',
        '/en/',
        '/ja/',
      ]);
      expect(html).not.toMatch(/<style|<script|style=/i);
    });

    it.each([
      ['GET', '/api/missing'],
      ['GET', '/api'],
      ['GET', '/assets/missing'],
      ['GET', '/fonts/missing'],
      ['GET', '/missing.png'],
      ['GET', '/missing.js'],
      ['HEAD', '/missing-page'],
      ['POST', '/missing-page'],
    ])('keeps the plain-text 404 for %s %s', async (method, pathname) => {
      const response = await runRoute(
        code,
        new Request(`https://example.com${pathname}`, { method })
      );
      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(await response.text()).toBe('Not Found');
    });
  });

  describe('generateFaviconRedirect', () => {
    let code;
    beforeAll(() => {
      code = generateFaviconRedirect();
    });

    it('should return a non-empty string', () => {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });

    it('should match /favicon.ico pathname', () => {
      expect(code).toContain('/favicon.ico');
    });

    it('should redirect to /assets/favicon.svg with 308', () => {
      expect(code).toContain('/assets/favicon.svg');
      expect(code).toContain('308');
      expect(code).toContain('Response.redirect');
    });
  });

  describe('generateErrorHandler', () => {
    const opts = { version: '1.0.0' };
    let code;
    beforeAll(() => {
      code = generateErrorHandler(opts);
    });

    it('should return a non-empty string', () => {
      expect(typeof code).toBe('string');
    });

    it('should contain catch block for error handling', () => {
      expect(code).toContain('catch');
    });

    it('logs the failure to Workers Logs instead of a D1 table', () => {
      expect(code).toContain('console.error');
      expect(code).not.toContain('INSERT INTO');
    });

    it('logs an unhandled request error with console.error', async () => {
      const failure = new Error('boom');
      const body = code.trimEnd().replace(/\};$/, '').trimEnd().replace(/\}$/, '');
      const run = new Function(
        'thrown',
        'request',
        'url',
        'metrics',
        'applyNonceToHeaders',
        'SECURITY_HEADERS',
        'rateLimitHeaders',
        'CACHE_POLICIES',
        `return (async () => { try { throw thrown; ${body} })();`
      );
      const metrics = { requests_error: 0 };
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const response = await run(
          failure,
          { method: 'GET' },
          { pathname: '/boom' },
          metrics,
          (headers) => headers,
          {},
          {},
          { api: {} }
        );
        expect(response.status).toBe(500);
        expect(metrics.requests_error).toBe(1);
        expect(errorSpy).toHaveBeenCalledWith('[worker 1.0.0] GET /boom failed:', failure.stack);
      } finally {
        errorSpy.mockRestore();
      }
    });

    it('should contain 500 Internal Server Error', () => {
      expect(code).toContain('500');
      expect(code).toContain('Internal Server Error');
    });

    it('should interpolate version', () => {
      expect(code).toContain('1.0.0');
    });
  });
});

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

describe('Worker Routes', () => {
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

    it('should contain Elasticsearch logging', () => {
      expect(code).toContain('logToElasticsearch');
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

    it('should contain D1 health check', () => {
      expect(code).toContain('env.DB');
    });

    it('should contain KV health check', () => {
      expect(code).toContain('env.SESSIONS');
    });

    it('should contain healthy and degraded statuses', () => {
      expect(code).toContain('healthy');
      expect(code).toContain('degraded');
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

    it('should serve /resume.pdf from the assets binding (no inline base64)', () => {
      expect(code).toContain('/resume.pdf');
      expect(code).toContain('application/pdf');
      expect(code).toContain('Content-Disposition');
      // PDF is no longer inlined: route must read from env.ASSETS, not atob a const.
      expect(code).toContain('env.ASSETS');
      expect(code).not.toContain('RESUME_PDF_BASE64');
      // Must have a 404 fallback when the asset is unavailable.
      expect(code).toContain('Resume PDF not found');
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
          new URL('https://resume.jclee.me/resume.pdf'),
          new Request('https://resume.jclee.me/resume.pdf'),
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
        expect(res.headers.get('Content-Disposition')).toContain('filename="resume_jclee.pdf"');
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
          new URL('https://resume.jclee.me/resume.pdf'),
          new Request('https://resume.jclee.me/resume.pdf'),
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
          new URL('https://resume.jclee.me/resume.pdf'),
          new Request('https://resume.jclee.me/resume.pdf'),
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

    it('should contain D1 error logging INSERT', () => {
      expect(code).toContain('INSERT');
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

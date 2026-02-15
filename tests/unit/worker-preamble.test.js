'use strict';

const { generateWorkerPreamble } = require('../../typescript/portfolio-worker/lib/worker-preamble');

describe('Worker Preamble', () => {
  const defaultOpts = {
    deployedAt: '2024-01-01T00:00:00Z',
    indexHtml: '<html><body>KO</body></html>',
    indexEnHtml: '<html><body>EN</body></html>',
    manifestJson: '{"name":"test","short_name":"test"}',
    serviceWorker: 'self.addEventListener("fetch",()=>{})',
    mainJs: 'console.log("main")',
    robotsTxt: 'User-agent: *\\nDisallow:',
    sitemapXml: '<?xml version="1.0"?><urlset></urlset>',
    ogImageBase64: 'dGVzdA==',
    ogImageEnBase64: 'dGVzdC1lbg==',
    resumePdfBase64: 'cGRm',
    securityHeadersJson: '{"X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"}',
    metricsJson: '{"requests_total":0}',
    initHistogramBucketsStr: 'function initHistogramBuckets() { return {}; }',
    generateHistogramLinesStr: 'function generateHistogramLines() { return ""; }',
    generateMetricsStr: 'function generateMetrics() { return ""; }',
    logToElasticsearchStr: 'async function logToElasticsearch() {}',
    rateLimitConfigJson: '{"api":{"limit":30,"window":60}}',
    authHelpersStr: 'async function verifySession() { return null; }',
  };

  let code;
  beforeAll(() => {
    code = generateWorkerPreamble(defaultOpts);
  });

  it('should return a non-empty string', () => {
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
  });

  describe('Constants', () => {
    it('should contain INDEX_HTML constant', () => {
      expect(code).toContain('INDEX_HTML');
    });

    it('should contain INDEX_EN_HTML constant', () => {
      expect(code).toContain('INDEX_EN_HTML');
    });

    it('should contain MANIFEST_JSON constant', () => {
      expect(code).toContain('MANIFEST_JSON');
    });

    it('should contain SERVICE_WORKER constant', () => {
      expect(code).toContain('SERVICE_WORKER');
    });

    it('should contain MAIN_JS constant', () => {
      expect(code).toContain('MAIN_JS');
    });

    it('should contain ROBOTS_TXT constant', () => {
      expect(code).toContain('ROBOTS_TXT');
    });

    it('should contain SITEMAP_XML constant', () => {
      expect(code).toContain('SITEMAP_XML');
    });

    it('should contain binary asset base64 constants', () => {
      expect(code).toContain('OG_IMAGE_BASE64');
      expect(code).toContain('OG_IMAGE_EN_BASE64');
      expect(code).toContain('RESUME_PDF_BASE64');
    });
  });

  describe('Security Headers', () => {
    it('should contain SECURITY_HEADERS with provided values', () => {
      expect(code).toContain('SECURITY_HEADERS');
      expect(code).toContain('nosniff');
    });
  });

  describe('Cache Policies', () => {
    it('should contain CACHE_POLICIES object', () => {
      expect(code).toContain('CACHE_POLICIES');
    });
  });

  describe('Rate Limiting', () => {
    it('should contain RATE_LIMIT_POLICIES', () => {
      expect(code).toContain('RATE_LIMIT_POLICIES');
    });

    it('should define rate limits for api, health, page, and static', () => {
      expect(code).toContain('30');
      expect(code).toContain('20');
      expect(code).toContain('120');
      expect(code).toContain('200');
    });

    it('should contain checkRateLimit function', () => {
      expect(code).toContain('checkRateLimit');
    });

    it('should contain getRateLimitHeaders function', () => {
      expect(code).toContain('getRateLimitHeaders');
    });

    it('should contain cleanup for stale entries', () => {
      expect(code).toMatch(/cleanup|cleanupStaleRateLimitEntries/i);
    });
  });

  describe('CORS Configuration', () => {
    it('should contain ALLOWED_CORS_ORIGINS', () => {
      expect(code).toContain('ALLOWED_CORS_ORIGINS');
    });

    it('should allow resume.jclee.me origin', () => {
      expect(code).toContain('resume.jclee.me');
    });

    it('should allow staging origin', () => {
      expect(code).toContain('staging');
    });

    it('should contain getCorsHeaders function', () => {
      expect(code).toContain('getCorsHeaders');
    });

    it('should contain createPreflightResponse function', () => {
      expect(code).toContain('createPreflightResponse');
    });
  });

  describe('Utility Functions', () => {
    it('should contain hasJsonContentType function', () => {
      expect(code).toContain('hasJsonContentType');
    });
  });

  describe('Embedded Code', () => {
    it('should contain auth helpers from opts', () => {
      expect(code).toContain('verifySession');
    });

    it('should contain ES logger code', () => {
      expect(code).toContain('logToElasticsearch');
    });

    it('should contain deployedAt timestamp', () => {
      expect(code).toContain('2024-01-01T00:00:00Z');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty authHelpersStr gracefully', () => {
      const minOpts = { ...defaultOpts, authHelpersStr: '' };
      const result = generateWorkerPreamble(minOpts);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

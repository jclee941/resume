/**
 * Unit tests for web/lib/security-headers.js
 */

const {
  generateSecurityHeaders,
  getCacheHeaders,
  CACHE_STRATEGIES,
} = require('../../../../typescript/portfolio-worker/lib/security-headers');

describe('Security Headers Module', () => {
  describe('CACHE_STRATEGIES', () => {
    test('should have HTML strategy', () => {
      expect(CACHE_STRATEGIES.HTML).toBe('public, max-age=3600, must-revalidate');
    });

    test('should have STATIC strategy', () => {
      expect(CACHE_STRATEGIES.STATIC).toBe('public, max-age=31536000, immutable');
    });

    test('should have DOCUMENT strategy', () => {
      expect(CACHE_STRATEGIES.DOCUMENT).toBe('public, max-age=86400');
    });

    test('should have API strategy', () => {
      expect(CACHE_STRATEGIES.API).toBe('no-cache, no-store, must-revalidate');
    });

    test('should have SW strategy', () => {
      expect(CACHE_STRATEGIES.SW).toBe('max-age=0, must-revalidate');
    });
  });

  describe('generateSecurityHeaders', () => {
    test('should generate headers with script and style hashes', () => {
      const scriptHashes = ["'sha256-abc123'"];
      const styleHashes = ["'sha256-def456'"];
      const headers = generateSecurityHeaders(scriptHashes, styleHashes);

      expect(headers['Content-Type']).toBe('text/html;charset=UTF-8');
      expect(headers['Content-Security-Policy']).toContain("'sha256-abc123'");
      expect(headers['Content-Security-Policy']).toContain("'sha256-def456'");
    });

    test('should include security headers', () => {
      const headers = generateSecurityHeaders([], []);

      expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    test('should include Cloudflare script hashes', () => {
      const headers = generateSecurityHeaders([], []);
      expect(headers['Content-Security-Policy']).toContain('sha256-ejv3KuWsiHLmQk4H');
    });

    test('should use HTML cache strategy by default', () => {
      const headers = generateSecurityHeaders([], []);
      expect(headers['Cache-Control']).toBe(CACHE_STRATEGIES.HTML);
    });

    test('should include Permissions-Policy', () => {
      const headers = generateSecurityHeaders([], []);
      expect(headers['Permissions-Policy']).toContain('camera=()');
      expect(headers['Permissions-Policy']).toContain('microphone=()');
    });
  });

  describe('getCacheHeaders', () => {
    test('should return HTML cache headers for HTML type', () => {
      const headers = getCacheHeaders('HTML');
      expect(headers['Cache-Control']).toBe(CACHE_STRATEGIES.HTML);
    });

    test('should return STATIC cache headers for STATIC type', () => {
      const headers = getCacheHeaders('STATIC');
      expect(headers['Cache-Control']).toBe(CACHE_STRATEGIES.STATIC);
    });

    test('should return DOCUMENT cache headers for DOCUMENT type', () => {
      const headers = getCacheHeaders('DOCUMENT');
      expect(headers['Cache-Control']).toBe(CACHE_STRATEGIES.DOCUMENT);
    });

    test('should return API cache headers for API type', () => {
      const headers = getCacheHeaders('API');
      expect(headers['Cache-Control']).toBe(CACHE_STRATEGIES.API);
    });

    test('should return SW cache headers for SW type', () => {
      const headers = getCacheHeaders('SW');
      expect(headers['Cache-Control']).toBe(CACHE_STRATEGIES.SW);
    });

    test('should fallback to HTML for unknown type', () => {
      const headers = getCacheHeaders('UNKNOWN');
      expect(headers['Cache-Control']).toBe(CACHE_STRATEGIES.HTML);
    });
  });
});

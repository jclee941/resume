/**
 * Unit tests for apps/portfolio/lib/security-headers.js
 */

const {
  generateSecurityHeaders,
  getCacheHeaders,
  CACHE_STRATEGIES,
  CSP_NONCE_PLACEHOLDER,
} = require('../../../../apps/portfolio/lib/security-headers');

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

  describe('CSP_NONCE_PLACEHOLDER', () => {
    test('should expose stable placeholder string', () => {
      expect(CSP_NONCE_PLACEHOLDER).toBe('__CSP_NONCE__');
    });
  });

  describe('generateSecurityHeaders', () => {
    test('uses CSP_NONCE_PLACEHOLDER by default', () => {
      const headers = generateSecurityHeaders([]);
      expect(headers['Content-Security-Policy']).toContain(`'nonce-${CSP_NONCE_PLACEHOLDER}'`);
      expect(headers['Content-Security-Policy']).toContain("'strict-dynamic'");
    });

    test('substitutes provided nonce in script-src and script-src-elem', () => {
      const headers = generateSecurityHeaders([], { nonce: 'abc123XYZ' });
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain("'nonce-abc123XYZ'");
      expect(csp).not.toContain('__CSP_NONCE__');
      expect(csp).toMatch(/script-src [^;]*'nonce-abc123XYZ'/);
      expect(csp).toMatch(/script-src-elem [^;]*'nonce-abc123XYZ'/);
    });

    test('includes provided style hashes', () => {
      const styleHashes = ["'sha256-def456'"];
      const headers = generateSecurityHeaders(styleHashes);
      expect(headers['Content-Security-Policy']).toContain("'sha256-def456'");
    });

    test('includes baseline security headers', () => {
      const headers = generateSecurityHeaders([]);
      expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('0');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    test('does not embed legacy Cloudflare script hash allowlist', () => {
      const headers = generateSecurityHeaders([]);
      expect(headers['Content-Security-Policy']).not.toContain('sha256-ejv3KuWsiHLmQk4H');
      expect(headers['Content-Security-Policy']).not.toContain('sha256-4cHQiB5K6cfR3bRbK3RY');
    });

    test('uses HTML cache strategy by default', () => {
      const headers = generateSecurityHeaders([]);
      expect(headers['Cache-Control']).toBe(CACHE_STRATEGIES.HTML);
    });

    test('includes Permissions-Policy', () => {
      const headers = generateSecurityHeaders([]);
      expect(headers['Permissions-Policy']).toContain('camera=()');
      expect(headers['Permissions-Policy']).toContain('microphone=()');
      expect(headers['Permissions-Policy']).toContain('geolocation=()');
    });

    test('includes modern cross-origin hardening headers', () => {
      const headers = generateSecurityHeaders([]);
      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
      expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
      expect(headers['Origin-Agent-Cluster']).toBe('?1');
    });

    test('restricts framing and script origins', () => {
      const headers = generateSecurityHeaders([]);
      expect(headers['Content-Security-Policy']).toContain("frame-src 'none'");
      expect(headers['Content-Security-Policy']).toContain('https://accounts.google.com');
    });

    test('allows data: URIs in img-src for inline noise SVG', () => {
      const headers = generateSecurityHeaders([]);
      expect(headers['Content-Security-Policy']).toContain("img-src 'self' https: data:");
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

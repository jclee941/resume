const { describe, test, expect } = require('@jest/globals');
const {
  generateSecurityHeaders,
  getCacheHeaders,
  CACHE_STRATEGIES,
} = require('../../apps/portfolio/lib/security-headers.js');

describe('Security Headers', () => {
  test('should include CSP header with required directives', () => {
    const headers = generateSecurityHeaders(["'sha256-test'"], ["'sha256-style'"]);
    expect(headers['Content-Security-Policy']).toBeDefined();
    expect(headers['Content-Security-Policy']).toContain("default-src 'none'");
    expect(headers['Content-Security-Policy']).toContain('script-src');
    expect(headers['Content-Security-Policy']).toContain("'sha256-test'");
  });

  test('should include HSTS header with secure configuration', () => {
    const headers = generateSecurityHeaders([], []);
    expect(headers['Strict-Transport-Security']).toBeDefined();
    expect(headers['Strict-Transport-Security']).toContain('max-age=');
    expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
  });

  test('should include X-Content-Type-Options nosniff', () => {
    const headers = generateSecurityHeaders([], []);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });
});

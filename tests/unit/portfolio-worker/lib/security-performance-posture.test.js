/**
 * Security + performance posture contract (고도화 review closure).
 *
 * The resume.jclee.me review concluded the live site already has a strong
 * security/performance posture, so the enhancement work intentionally made NO
 * risky changes to either area. These tests LOCK that posture so the
 * "reviewed, already good" conclusion is enforced by code rather than left as a
 * claim: a future regression that weakens the CSP, drops a hardening header, or
 * bloats the worker bundle past budget will fail CI.
 *
 * Source of truth: apps/portfolio/lib/security-headers.js (header policy) and
 * the generated apps/portfolio/worker.js (bundle size budget).
 */

const fs = require('fs');
const path = require('path');

const { generateSecurityHeaders } = require('../../../../apps/portfolio/lib/security-headers');

const PORTFOLIO = path.join(__dirname, '..', '..', '..', '..', 'apps', 'portfolio');

describe('고도화 closure: security posture is locked', () => {
  const headers = generateSecurityHeaders([]);
  const csp = headers['Content-Security-Policy'];

  test('CSP locks down default-src and dangerous sinks', () => {
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test('CSP uses nonce + strict-dynamic (no unsafe-inline/unsafe-eval for scripts)', () => {
    expect(csp).toMatch(/script-src [^;]*'strict-dynamic'/);
    expect(csp).not.toMatch(/script-src [^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/script-src [^;]*'unsafe-eval'/);
  });

  test('HSTS is long-lived and preload-eligible', () => {
    const hsts = headers['Strict-Transport-Security'];
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).toContain('preload');
    const maxAge = Number((hsts.match(/max-age=(\d+)/) || [])[1]);
    // Preload list requires >= 1 year (31536000s).
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
  });

  test('clickjacking + MIME-sniffing + cross-origin hardening headers stay present', () => {
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });

  test('Permissions-Policy denies powerful features by default', () => {
    const pp = headers['Permissions-Policy'];
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) {
      expect(pp).toContain(`${feature}=()`);
    }
  });

  test('Trusted Types DOM-XSS hardening is shipped (report-only, not yet enforced)', () => {
    expect(headers['Content-Security-Policy-Report-Only']).toContain(
      "require-trusted-types-for 'script'"
    );
  });
});

const WORKER_PATH = path.join(PORTFOLIO, 'worker.js');
const workerBuilt = fs.existsSync(WORKER_PATH);

// worker.js is a generated artifact. When the suite runs before a build, skip
// VISIBLY (describe.skip) instead of silently passing, so an absent build is
// reported as skipped rather than a false green.
const describePerf = workerBuilt ? describe : describe.skip;

describePerf('고도화 closure: performance budget is locked', () => {
  test('generated worker bundle stays under the 1.5MB edge budget', () => {
    const bytes = fs.statSync(WORKER_PATH).size;
    // Current bundle is ~0.8MB (single-worker consolidation per ADR 0009).
    // Budget leaves headroom but fails fast on accidental asset re-inlining
    // (e.g. base64 PDF/OG images) that would regress edge cold-start.
    const BUDGET_BYTES = 1.5 * 1024 * 1024;
    expect(bytes).toBeLessThan(BUDGET_BYTES);
  });

  test('worker does not re-inline large base64 image payloads', () => {
    const src = fs.readFileSync(WORKER_PATH, 'utf-8');
    // OG/PDF assets are served via routes/env.ASSETS, not inlined. A large
    // inline base64 blob would indicate a regression back to bundling assets.
    const bigBase64 = src.match(/base64,[A-Za-z0-9+/=]{2000,}/g) || [];
    expect(bigBase64.length).toBe(0);
  });
});

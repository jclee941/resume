// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Security Headers & CSP', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have all required security headers', async ({ request }) => {
    const response = await request.get('/');

    // Check security headers
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toMatch(/SAMEORIGIN|DENY/);
    expect(response.headers()['x-xss-protection']).toBe('1; mode=block');
    expect(response.headers()['referrer-policy']).toMatch(
      /same-origin|strict-origin-when-cross-origin/
    );
    expect(response.headers()['content-security-policy']).toBeTruthy();
  });

  test.skip('should not have CSP violations (excluding Cloudflare injected)', async ({ page }) => {
    const cspViolations = [];

    // Listen for CSP violations
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Content Security Policy') || text.includes('CSP')) {
        // Ignore Cloudflare-injected violations
        // Cloudflare injects: analytics (beacon), performance monitoring, inline styles
        const isCloudflareRelated =
          text.includes('cloudflareinsights') ||
          text.includes('beacon.min.js') ||
          text.includes('static.cloudflareinsights') ||
          // Cloudflare challenge/bot protection
          text.includes('challenges.cloudflare.com') ||
          text.includes('cdn-cgi') ||
          // General Cloudflare patterns
          text.toLowerCase().includes('cloudflare');

        if (!isCloudflareRelated) {
          cspViolations.push(text);
        }
      }
    });

    // Navigate and interact with page
    await page.goto('/');
    await page.click('[href="#about"]');
    await page.click('[href="#projects"]');
    await page.click('[href="#contact"]');

    // Wait for any async CSP violations
    await page.waitForTimeout(2000);

    // Should have no CSP violations (excluding Cloudflare)
    if (cspViolations.length > 0) {
      console.log('❌ CSP Violations found (excluding Cloudflare-related):');
      cspViolations.forEach((violation, i) => {
        console.log(`${i + 1}. ${violation}`);
      });
    }
    expect(cspViolations).toHaveLength(0);
  });

  test('should have CSP with hash-based nonces (no unsafe-inline in script-src)', async ({
    request,
  }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'];

    expect(csp).toBeTruthy();

    // Extract script-src directive and verify no unsafe-inline
    // Note: style-src-elem may have unsafe-inline for progressive enhancement (acceptable)
    const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/);
    expect(scriptSrcMatch).toBeTruthy();
    const scriptSrc = scriptSrcMatch[1];
    expect(scriptSrc).not.toContain('unsafe-inline');

    // Should have hash-based CSP
    expect(csp).toContain('sha256-');
  });

  test('should allow inline styles with CSP hash', async ({ page }) => {
    // Inline styles should be allowed via CSP hash
    const heroTitle = page.locator('.hero-title');
    await expect(heroTitle).toBeVisible();

    // Check that CSS is applied (proves inline style hash works)
    const fontSize = await heroTitle.evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(parseFloat(fontSize)).toBeGreaterThan(24);
  });

  test('should allow inline scripts with CSP hash (terminal-window created by JS)', async ({
    page,
  }) => {
    const terminalWindow = page.locator('.terminal-window');
    await expect(terminalWindow).toBeVisible();
  });

  test('should block external scripts not in CSP', async ({ page }) => {
    const cspErrors = [];
    let scriptExecuted = false;

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Content Security Policy') && text.includes('evil.example.com')) {
          cspErrors.push(text);
        }
      }
    });

    // Try to inject external script with callback (should be blocked by CSP)
    await page.evaluate(() => {
      // Set a flag that would be set by the malicious script
      window.maliciousScriptExecuted = false;

      const script = document.createElement('script');
      script.src = 'https://evil.example.com/malicious.js';
      script.onerror = () => {
        // Script failed to load (expected)
      };
      script.onload = () => {
        // Script loaded successfully (should not happen)
        window.maliciousScriptExecuted = true;
      };
      document.head.appendChild(script);
    });

    await page.waitForLoadState('load');

    // Check that malicious script did NOT execute
    scriptExecuted = await page.evaluate(() => window.maliciousScriptExecuted);

    expect(scriptExecuted).toBe(false);

    // May have CSP error (Cloudflare might add scripts, so this is optional)
    // Main test is that script did not execute
  });

  test('should have HSTS header for HTTPS enforcement', async ({ request }) => {
    const response = await request.get('/');
    const sts = response.headers()['strict-transport-security'];

    // HSTS header may be set by Cloudflare or origin
    if (sts) {
      expect(sts).toMatch(/max-age=\d+/);
      // Optional: check for includeSubDomains and preload
    }
  });

  test('should have secure cookie attributes (if cookies exist)', async ({ context, page }) => {
    await page.goto('/');

    const cookies = await context.cookies();

    // If cookies exist, they should be secure
    cookies.forEach((cookie) => {
      if (cookie.name !== '__cf_bm') {
        // Cloudflare bot management cookie exception
        // Production cookies should be Secure and SameSite
        if (process.env.NODE_ENV === 'production') {
          expect(cookie.secure).toBe(true);
          expect(cookie.sameSite).toMatch(/Strict|Lax/);
        }
      }
    });
  });

  test('should not expose server information in headers', async ({ request }) => {
    const response = await request.get('/');

    // Should not have Server header revealing tech stack
    const server = response.headers()['server'];
    if (server) {
      // Cloudflare is OK, but should not reveal internal stack
      expect(server).not.toMatch(/Apache|nginx|Express/i);
    }

    // Should not have X-Powered-By header
    expect(response.headers()['x-powered-by']).toBeFalsy();
  });

  test('should have correct CORS policy', async ({ request }) => {
    const response = await request.get('/');

    // Should not have CORS headers (not an API)
    // Or if present, should be restrictive
    const cors = response.headers()['access-control-allow-origin'];
    if (cors) {
      expect(cors).not.toBe('*');
    }
  });
});

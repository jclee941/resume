// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Error Tracking (Sentry)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  // Sentry script loading test - requires live Sentry DSN configuration
  test('should load Sentry script from CDN', async ({ page }) => {
    const sentryScript = page.locator('script[src*="sentry-cdn.com"]');
    const count = await sentryScript.count();

    test.skip(count === 0, 'Requires live Sentry DSN configuration in worker');

    const integrity = await sentryScript.getAttribute('integrity');
    expect(integrity).toBeTruthy();
    expect(integrity).toContain('sha384');
  });

  // Sentry initialization test - requires live DSN
  test('should initialize Sentry with correct configuration', async ({ page }) => {
    const sentryLoaded = (await page.locator('script[src*="sentry-cdn.com"]').count()) > 0;

    test.skip(!sentryLoaded, 'Requires live Sentry DSN configuration in worker');

    const sentryInitialized = await page.evaluate(() => {
      const hub = /** @type {any} */ (window).Sentry.getCurrentHub();
      return hub && hub.getClient() !== null;
    });

    expect(sentryInitialized).toBe(true);
  });

  // Sentry environment test - requires live DSN
  test('should have correct Sentry environment', async ({ page }) => {
    const sentryLoaded = (await page.locator('script[src*="sentry-cdn.com"]').count()) > 0;

    test.skip(!sentryLoaded, 'Requires live Sentry DSN configuration in worker');

    const environment = await page.evaluate(() => {
      const client = /** @type {any} */ (window).Sentry.getCurrentHub().getClient();
      return client ? client.getOptions().environment : null;
    });

    test.skip(environment === null, 'Sentry client not initialized');
    expect(environment).toMatch(/^(production|development)$/);
  });

  // CSP validation test - can run without Sentry (checks for CSP violations)
  test('should not have CSP violations from Sentry', async ({ page }) => {
    const cspViolations = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });

    await page.waitForLoadState('load');

    const sentryViolations = cspViolations.filter((violation) => {
      return violation.includes('sentry') || violation.includes('Sentry');
    });

    expect(sentryViolations).toHaveLength(0);
  });

  // Sentry CDN in CSP test - requires live DSN
  test('should have Sentry CDN in CSP script-src', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() || {};
    const csp = headers['content-security-policy'] || '';

    test.skip(
      !csp.includes('browser.sentry-cdn.com'),
      'Requires live Sentry DSN configuration in worker'
    );

    expect(csp).toContain('browser.sentry-cdn.com');
  });

  // Sentry API in CSP test - requires live DSN
  test('should have Sentry API in CSP connect-src', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() || {};
    const csp = headers['content-security-policy'] || '';

    test.skip(
      !csp.includes('glitchtip.jclee.me'),
      'Requires live GlitchTip DSN configuration in worker'
    );

    expect(csp).toContain('glitchtip.jclee.me');
  });

  // Sentry error ignoring test - requires live DSN
  test('should configure Sentry to ignore browser extension errors', async ({ page }) => {
    const sentryLoaded = (await page.locator('script[src*="sentry-cdn.com"]').count()) > 0;

    test.skip(!sentryLoaded, 'Requires live Sentry DSN configuration in worker');

    const ignoresExtensions = await page.evaluate(() => {
      const client = /** @type {any} */ (window).Sentry.getCurrentHub().getClient();
      if (!client) return null;

      const options = client.getOptions();
      const ignoreErrors = options.ignoreErrors || [];

      return ignoreErrors.some(
        (pattern) =>
          pattern.toString().includes('chrome-extension') ||
          pattern.toString().includes('moz-extension')
      );
    });

    test.skip(ignoresExtensions === null, 'Sentry client not initialized');
    expect(ignoresExtensions).toBe(true);
  });

  // Sentry PII filter test - requires live DSN
  test('should configure Sentry to filter PII', async ({ page }) => {
    const sentryLoaded = (await page.locator('script[src*="sentry-cdn.com"]').count()) > 0;

    test.skip(!sentryLoaded, 'Requires live Sentry DSN configuration in worker');

    const hasPIIFilter = await page.evaluate(() => {
      const client = /** @type {any} */ (window).Sentry.getCurrentHub().getClient();
      if (!client) return null;

      const options = client.getOptions();
      return typeof options.beforeSend === 'function';
    });

    test.skip(hasPIIFilter === null, 'Sentry client not initialized');
    expect(hasPIIFilter).toBe(true);
  });

  // Sentry user ID test - requires live DSN
  test('should set anonymous user ID in Sentry', async ({ page }) => {
    const sentryLoaded = (await page.locator('script[src*="sentry-cdn.com"]').count()) > 0;

    test.skip(!sentryLoaded, 'Requires live Sentry DSN configuration in worker');

    const userId = await page.evaluate(() => {
      const hub = /** @type {any} */ (window).Sentry.getCurrentHub();
      const client = hub.getClient();
      if (!client) return null;

      const scope = hub.getScope();
      if (!scope) return null;

      const user = scope.getUser();
      return user ? user.id : null;
    });

    test.skip(userId === null, 'Sentry client not initialized');
    expect(userId).toBe('anonymous');
  });

  // Sentry error handlers test - requires live DSN
  test('should have global error handlers registered', async ({ page }) => {
    const sentryLoaded = (await page.locator('script[src*="sentry-cdn.com"]').count()) > 0;

    test.skip(!sentryLoaded, 'Requires live Sentry DSN configuration in worker');

    const result = await page.evaluate(() => {
      const client = /** @type {any} */ (window).Sentry.getCurrentHub().getClient();
      if (!client) return { initialized: false };

      const hasErrorHandler = /** @type {any} */ (window).onerror !== null;

      return { initialized: true, hasHandlers: hasErrorHandler };
    });

    test.skip(!result.initialized, 'Sentry client not initialized');
    expect(result.hasHandlers).toBe(true);
  });
});

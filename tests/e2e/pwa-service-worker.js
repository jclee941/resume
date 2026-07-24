const { test, expect } = require('@playwright/test');
const { requestOptions, skipIfLocalRateLimited } = require('./pwa-helpers.js');

test.describe('Progressive Web App (PWA)', () => {
  test('should serve Service Worker script', async ({ request }, testInfo) => {
    const response = await request.get('/sw.js', requestOptions(testInfo));
    skipIfLocalRateLimited(response, '/sw.js', testInfo);

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('javascript');

    // Check cache headers
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('must-revalidate');

    const swCode = await response.text();

    // Check Service Worker contains required features
    expect(swCode).toContain('install');
    expect(swCode).toContain('activate');
    expect(swCode).toContain('fetch');
    expect(swCode).toContain('CACHE_NAME');
  });

  test('should register Service Worker on page load', async ({ page }) => {
    const skipSWTests = process.env.SKIP_SERVICE_WORKER_TESTS === 'true';

    if (skipSWTests) {
      test.skip(
        true,
        'SKIP_SERVICE_WORKER_TESTS=true: Service Worker tests skipped. ' +
          'Set to false to enforce SW registration verification.'
      );
    }

    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    let swRegistered = false;
    const registrationErrors = [];

    try {
      await page.waitForFunction(
        async () => {
          if (!('serviceWorker' in navigator)) {
            return false;
          }

          try {
            if (navigator.serviceWorker.controller !== null) {
              return true;
            }

            const regs = await navigator.serviceWorker.getRegistrations();
            if (regs.length > 0) {
              return regs.some((reg) => reg.active || reg.installing || reg.waiting);
            }

            return false;
          } catch (error) {
            registrationErrors.push(error.message);
            return false;
          }
        },
        { timeout: 5000 }
      );

      swRegistered = true;
    } catch (_error) {
      const relevantConsoleMsgs = consoleMessages.filter(
        (m) =>
          m.text.toLowerCase().includes('service') ||
          m.text.toLowerCase().includes('worker') ||
          m.type === 'error'
      );

      expect(
        swRegistered,
        'Service Worker not registered after 5000ms. ' +
          `Errors: ${JSON.stringify(registrationErrors)}. ` +
          `Console messages: ${JSON.stringify(relevantConsoleMsgs)}. ` +
          'If this environment does not support Service Workers, set SKIP_SERVICE_WORKER_TESTS=true.'
      ).toBeTruthy();
    }
  });

  test('Service Worker should have Service-Worker-Allowed header', async ({
    request,
  }, testInfo) => {
    const response = await request.get('/sw.js', requestOptions(testInfo));
    skipIfLocalRateLimited(response, '/sw.js', testInfo);

    const swAllowed = response.headers()['service-worker-allowed'];
    expect(swAllowed).toBe('/');
  });
});

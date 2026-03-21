// @ts-check
const { test, expect } = require('@playwright/test');

function getBaseUrl(testInfo) {
  const configured = testInfo.project?.use?.baseURL || process.env.PLAYWRIGHT_BASE_URL;
  const fallback = process.env.CI ? 'http://localhost:8787' : '';
  return String(configured || fallback).replace(/\/+$/, '');
}

function isLocalBaseUrl(testInfo) {
  return /127\.0\.0\.1|localhost/.test(getBaseUrl(testInfo));
}

let localProbeCounter = 0;

function requestOptions(testInfo) {
  if (!isLocalBaseUrl(testInfo)) {
    return { failOnStatusCode: false };
  }

  localProbeCounter = (localProbeCounter + 1) % 200;
  return {
    failOnStatusCode: false,
    headers: {
      'cf-connecting-ip': `203.0.113.${localProbeCounter + 1}`,
    },
  };
}

function skipIfLocalRateLimited(response, endpoint, testInfo) {
  if (isLocalBaseUrl(testInfo) && response.status() === 429) {
    test.skip(true, `Local worker rate limited ${endpoint} during PWA verification`);
  }
}

test.describe('Progressive Web App (PWA)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should have manifest.json link', async ({ page }) => {
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
  });

  test('should have PWA meta tags', async ({ page }) => {
    // Theme color
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#0c0c12');

    // Apple mobile web app
    const appleCapable = page.locator('meta[name="apple-mobile-web-app-capable"]');
    if ((await appleCapable.count()) > 0) {
      await expect(appleCapable).toHaveAttribute('content', 'yes');
    }

    const appleTitle = page.locator('meta[name="apple-mobile-web-app-title"]');
    await expect(appleTitle).toHaveAttribute('content', 'JC Lee Resume');
  });

  test('should serve valid manifest.json', async ({ request }, testInfo) => {
    const response = await request.get('/manifest.json', requestOptions(testInfo));
    skipIfLocalRateLimited(response, '/manifest.json', testInfo);

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');

    const manifest = await response.json();

    // Check required fields
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#0c0c12');
    expect(manifest.background_color).toBe('#0f0f23');

    // Check icons
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Check shortcuts
    expect(manifest.shortcuts).toBeInstanceOf(Array);
    expect(manifest.shortcuts.length).toBeGreaterThan(0);
  });

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

  test('manifest should have valid shortcuts', async ({ request }, testInfo) => {
    const response = await request.get('/manifest.json', requestOptions(testInfo));
    skipIfLocalRateLimited(response, '/manifest.json', testInfo);
    const manifest = await response.json();

    // Check shortcuts structure
    manifest.shortcuts.forEach((shortcut) => {
      expect(shortcut.name).toBeTruthy();
      expect(shortcut.url).toBeTruthy();
      expect(shortcut.url).toMatch(/^\/|#/);
    });

    // Should have Resume, Projects, Contact shortcuts
    const shortcutNames = manifest.shortcuts.map((s) => s.name);
    expect(shortcutNames).toContain('Resume');
    expect(shortcutNames).toContain('Projects');
    expect(shortcutNames).toContain('Contact');
  });

  test('manifest should have correct language settings', async ({ request }, testInfo) => {
    const response = await request.get('/manifest.json', requestOptions(testInfo));
    skipIfLocalRateLimited(response, '/manifest.json', testInfo);
    const manifest = await response.json();

    expect(manifest.lang).toBe('ko-KR');
    expect(manifest.dir).toBe('ltr');
  });

  test('manifest should be installable', async ({ request }, testInfo) => {
    const response = await request.get('/manifest.json', requestOptions(testInfo));
    skipIfLocalRateLimited(response, '/manifest.json', testInfo);
    const manifest = await response.json();

    // Check installability criteria
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Check for required icon sizes (192x192 and 512x512)
    const iconSizes = manifest.icons.map((icon) => icon.sizes);
    expect(iconSizes).toContain('192x192');
    expect(iconSizes).toContain('512x512');
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

import { test, expect } from '@playwright/test';

function expectNoCache(headers) {
  const cacheControl = headers['cache-control'] || '';
  expect(cacheControl).toContain('no-cache');
}

function expectStaticCache(headers) {
  const cacheControl = headers['cache-control'] || '';
  expect(cacheControl).toContain('public');
  expect(cacheControl).toContain('max-age=');
}

test.describe('Worker Startup', () => {
  test('GET / returns 200 with HTML content-type', async ({ page }) => {
    const response = await page.request.get('/');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
  });
});

test.describe('Health Endpoints', () => {
  test('GET /health returns JSON status and bindings', async ({ page }) => {
    const response = await page.request.get('/health');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.bindings).toBeTruthy();
    expect(typeof body.bindings).toBe('object');
  });

  test('GET /healthz returns healthy response', async ({ page }) => {
    const response = await page.request.get('/healthz');

    test.skip(response.status() === 404, '/healthz endpoint is not exposed in this environment');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('GET /metrics returns Prometheus text format', async ({ page }) => {
    const response = await page.request.get('/metrics');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');

    const body = await response.text();
    expect(body).toMatch(/^(# HELP|# TYPE)/m);
  });
});

test.describe('Route Verification', () => {
  test('GET /sitemap.xml returns XML content and status 200', async ({ page }) => {
    const response = await page.request.get('/sitemap.xml');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('xml');
  });

  test('GET /robots.txt returns text content', async ({ page }) => {
    const response = await page.request.get('/robots.txt');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');

    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
  });

  test('GET /en returns 200 HTML page', async ({ page }) => {
    const response = await page.goto('/en', { waitUntil: 'domcontentloaded' });

    expect(response).toBeTruthy();
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
  });

  test('GET /nonexistent returns 404', async ({ page }) => {
    const response = await page.request.get('/nonexistent');
    expect(response.status()).toBe(404);
  });
});

test.describe('Response Headers', () => {
  test('health endpoints use no-cache policy', async ({ page }) => {
    const healthResponse = await page.request.get('/health');
    const metricsResponse = await page.request.get('/metrics');

    expectNoCache(healthResponse.headers());
    expectNoCache(metricsResponse.headers());
  });

  test('static routes return cacheable headers', async ({ page }) => {
    const faviconSvgResponse = await page.request.get('/assets/favicon.svg');
    const faviconPngResponse = await page.request.get('/assets/favicon-32x32.png');

    expect(faviconSvgResponse.status()).toBe(200);
    expect(faviconPngResponse.status()).toBe(200);
    expectStaticCache(faviconSvgResponse.headers());
    expectStaticCache(faviconPngResponse.headers());
  });

  test('security headers are present on responses', async ({ page }) => {
    const response = await page.request.get('/');
    const headers = response.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toMatch(/SAMEORIGIN|DENY/);
  });
});

test.describe('Job Worker Proxy', () => {
  test('GET /job/health returns job health when backend is available', async ({ page }) => {
    const response = await page.request.get('/job/health');

    test.skip(
      response.status() === 403 || response.status() === 500,
      'Job backend unavailable in this environment'
    );

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(body).toBeTruthy();
    expect(typeof body).toBe('object');
  });

  test('GET /job/api/health returns API health when backend is available', async ({ page }) => {
    const response = await page.request.get('/job/api/health');

    test.skip(
      response.status() === 403 || response.status() === 500,
      'Job backend unavailable in this environment'
    );

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(body).toBeTruthy();
    expect(typeof body).toBe('object');
  });
});

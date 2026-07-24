import { test, expect } from '@playwright/test';

const PROBE_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9,ko;q=0.8',
};

function withProbeHeaders(extraHeaders = {}) {
  return { ...PROBE_HEADERS, ...extraHeaders };
}

function getBaseUrl(testInfo) {
  const configured = testInfo.project?.use?.baseURL || process.env.PLAYWRIGHT_BASE_URL;
  return String(configured || 'http://localhost:8787').replace(/\/+$/, '');
}

function isLocalBaseUrl(testInfo) {
  return /127\.0\.0\.1|localhost/.test(getBaseUrl(testInfo));
}

async function skipIfEdgeProtectionBlocksRunner(request) {
  const response = await request.get('/', {
    failOnStatusCode: false,
    headers: withProbeHeaders(),
  });
  test.skip(
    response.status() === 403,
    'Edge protection blocks GitHub runner for production probes (HTTP 403)'
  );
}

function skipIfLocalRateLimited(response, endpoint, testInfo) {
  if (isLocalBaseUrl(testInfo) && response.status() === 429) {
    test.skip(true, `Local worker rate limited ${endpoint} during deployment verification`);
  }
}

function expect200OrSkipLocalRateLimit(response, endpoint, testInfo) {
  skipIfLocalRateLimited(response, endpoint, testInfo);
  expect(response.status()).toBe(200);
}

test.describe('@deploy-verify API Endpoints', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfEdgeProtectionBlocksRunner(request);
  });

  test('robots.txt returns 200 and includes User-agent', async ({ request }, testInfo) => {
    const response = await request.get('/robots.txt', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/robots.txt', testInfo);
    const body = await response.text();
    expect(body).toMatch(/user-agent/i);
  });

  test('sitemap.xml returns 200 with valid sitemap root', async ({ request }, testInfo) => {
    const response = await request.get('/sitemap.xml', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/sitemap.xml', testInfo);

    const body = await response.text();
    expect(body).toMatch(/<urlset|<sitemapindex/i);
  });

  test('metrics endpoint is reachable as API surface', async ({ request }, testInfo) => {
    const response = await request.get('/metrics', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/metrics', testInfo);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toMatch(
      /text\/plain|application\/openmetrics-text|application\/octet-stream/i
    );
  });

  test('POST to unknown endpoint does not return 500', async ({ request }) => {
    const response = await request.post('/api/does-not-exist', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
      data: { probe: true },
    });

    expect(response.status()).not.toBe(500);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('favicon.ico redirects (308) to canonical /assets/favicon.svg', async ({
    request,
  }, testInfo) => {
    const response = await request.get('/favicon.ico', {
      failOnStatusCode: false,
      maxRedirects: 0,
      headers: withProbeHeaders(),
    });
    skipIfLocalRateLimited(response, '/favicon.ico', testInfo);
    expect(response.status()).toBe(308);
    const location = response.headers()['location'] || '';
    expect(location).toMatch(/\/assets\/favicon\.svg$/);
  });

  test('/assets/favicon.svg returns 200 image/svg+xml', async ({ request }, testInfo) => {
    const response = await request.get('/assets/favicon.svg', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/assets/favicon.svg', testInfo);
    expect(response.headers()['content-type'] || '').toMatch(/image\/svg\+xml/i);
  });
});

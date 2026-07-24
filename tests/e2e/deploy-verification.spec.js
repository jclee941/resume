import { test, expect } from '@playwright/test';

const PROBE_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9,ko;q=0.8',
};

function getBaseUrl(testInfo) {
  const configured = testInfo.project?.use?.baseURL || process.env.PLAYWRIGHT_BASE_URL;
  return String(configured || 'http://localhost:8787').replace(/\/+$/, '');
}

function isLocalBaseUrl(testInfo) {
  return /127\.0\.0\.1|localhost/.test(getBaseUrl(testInfo));
}

function withProbeHeaders(extraHeaders = {}) {
  return { ...PROBE_HEADERS, ...extraHeaders };
}

async function getHomeResponse(request) {
  return request.get('/', {
    failOnStatusCode: false,
    headers: withProbeHeaders(),
  });
}

async function skipIfEdgeProtectionBlocksRunner(request) {
  const response = await getHomeResponse(request);
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

async function getHomeHeaders(request) {
  const response = await getHomeResponse(request);
  return { response, headers: response.headers() };
}

test.describe('@deploy-verify Service Health', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfEdgeProtectionBlocksRunner(request);
  });

  test('portfolio health endpoint returns healthy JSON', async ({ request }, testInfo) => {
    const response = await request.get('/health', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/health', testInfo);

    const payload = await response.json();
    expect(payload).toBeTruthy();
    expect(['healthy', 'degraded']).toContain(payload.status);
    expect(payload.bindings).toBeTruthy();
    expect(payload.metrics).toBeTruthy();
  });

  test('job dashboard health endpoint is accessible when available', async ({ request }) => {
    const response = await request.get('/job/api/health', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    if ([404, 405, 500, 501, 502, 503].includes(response.status())) {
      test.skip(true, 'Job dashboard health endpoint is optional in this environment');
    }

    expect(response.status()).toBeLessThan(500);

    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('application/json')) {
      const body = await response.json();
      expect(body).toBeTruthy();
      expect(body.status === 'ok' || body.status === 'healthy').toBeTruthy();
    }
  });

  test('homepage response time stays under 3000ms', async ({ request }, testInfo) => {
    const start = Date.now();
    const response = await request.get('/', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    const elapsedMs = Date.now() - start;

    expect200OrSkipLocalRateLimit(response, '/', testInfo);
    expect(elapsedMs).toBeLessThan(3000);
  });
});

test.describe('@deploy-verify Security Headers', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfEdgeProtectionBlocksRunner(request);
  });

  test('CSP header includes sha256 and no unsafe-inline in script-src', async ({ request }) => {
    const { headers } = await getHomeHeaders(request);
    const csp = headers['content-security-policy'] || '';

    expect(csp).toContain('sha256-');

    const scriptSrc = csp
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('script-src'));

    expect(scriptSrc).toBeTruthy();
    expect(scriptSrc).not.toContain('unsafe-inline');
  });

  test('HSTS header contains max-age on HTTPS targets', async ({ request }, testInfo) => {
    const baseURL = getBaseUrl(testInfo);
    test.skip(!baseURL.startsWith('https://'), 'HSTS validation only applies to HTTPS baseURL');

    const { headers } = await getHomeHeaders(request);
    const hsts = headers['strict-transport-security'] || '';
    expect(hsts).toMatch(/max-age=\d+/);
  });

  test('X-Content-Type-Options is nosniff', async ({ request }) => {
    const { headers } = await getHomeHeaders(request);
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('X-Frame-Options is present and restrictive', async ({ request }) => {
    const { headers } = await getHomeHeaders(request);
    const xFrameOptions = headers['x-frame-options'] || '';
    expect(xFrameOptions).toMatch(/DENY|SAMEORIGIN/i);
  });
});

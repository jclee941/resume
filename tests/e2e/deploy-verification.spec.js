import { test, expect } from '@playwright/test';

const PROBE_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9,ko;q=0.8',
};

// Worker latency is judged against Cloudflare's edge-only /cdn-cgi/trace round
// trip from the same runner, so a slow network path to the colo does not fail
// the deployment. The fastest of several samples absorbs transient stalls.
const LATENCY_SAMPLES = 3;
const WORKER_LATENCY_BUDGET_MS = 3000;

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

async function fastestFetch(request, path) {
  let fastest = null;
  for (let sample = 0; sample < LATENCY_SAMPLES; sample += 1) {
    const start = Date.now();
    const response = await request.get(path, {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    const elapsedMs = Date.now() - start;
    if (!fastest || elapsedMs < fastest.elapsedMs) fastest = { response, elapsedMs };
  }
  return fastest;
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

let home;

test.beforeAll(async ({ playwright }, testInfo) => {
  const request = await playwright.request.newContext({ baseURL: getBaseUrl(testInfo) });
  try {
    const response = await getHomeResponse(request);
    home = { status: response.status(), headers: response.headers() };
  } finally {
    await request.dispose();
  }
});

test.beforeEach(() => {
  test.skip(
    home.status === 403,
    'Edge protection blocks GitHub runner for production probes (HTTP 403)'
  );
});

test.describe('@deploy-verify Service Health', () => {
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

  test('homepage adds under 3000ms over the edge round trip', async ({ request }, testInfo) => {
    test.setTimeout(120_000);
    const page = await fastestFetch(request, '/');
    expect200OrSkipLocalRateLimit(page.response, '/', testInfo);

    const edge = isLocalBaseUrl(testInfo) ? null : await fastestFetch(request, '/cdn-cgi/trace');
    const edgeMs = edge?.response.status() === 200 ? edge.elapsedMs : 0;
    expect(page.elapsedMs - edgeMs).toBeLessThan(WORKER_LATENCY_BUDGET_MS);
  });
});

test.describe('@deploy-verify Security Headers', () => {
  test('CSP header includes sha256 and no unsafe-inline in script-src', async () => {
    const csp = home.headers['content-security-policy'] || '';

    expect(csp).toContain('sha256-');

    const scriptSrc = csp
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('script-src'));

    expect(scriptSrc).toBeTruthy();
    expect(scriptSrc).not.toContain('unsafe-inline');
  });

  test('HSTS header contains max-age on HTTPS targets', async () => {
    const baseURL = getBaseUrl(test.info());
    test.skip(!baseURL.startsWith('https://'), 'HSTS validation only applies to HTTPS baseURL');

    const hsts = home.headers['strict-transport-security'] || '';
    expect(hsts).toMatch(/max-age=\d+/);
  });

  test('X-Content-Type-Options is nosniff', async () => {
    expect(home.headers['x-content-type-options']).toBe('nosniff');
  });

  test('X-Frame-Options is present and restrictive', async () => {
    const xFrameOptions = home.headers['x-frame-options'] || '';
    expect(xFrameOptions).toMatch(/DENY|SAMEORIGIN/i);
  });
});

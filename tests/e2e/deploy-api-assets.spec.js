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

  test('/resume.pdf returns a non-empty PDF (magic bytes %PDF-)', async ({ request }, testInfo) => {
    const response = await request.get('/resume.pdf', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/resume.pdf', testInfo);
    expect(response.headers()['content-type'] || '').toMatch(/application\/pdf/i);
    const body = await response.body();
    expect(body.length).toBeGreaterThan(10_000);
    // PDF files start with the magic header %PDF-
    expect(body.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  test('/sw.js returns a parseable service worker', async ({ request }, testInfo) => {
    const response = await request.get('/sw.js', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/sw.js', testInfo);
    expect(response.headers()['content-type'] || '').toMatch(/javascript/i);
    const body = await response.text();
    expect(body).toContain("self.addEventListener('install'");
    // Must be parseable as JS (no truncation, no embedded backticks bleed).
    expect(() => new Function(body)).not.toThrow();
  });

  test('/manifest.json returns 200 valid PWA manifest', async ({ request }, testInfo) => {
    const response = await request.get('/manifest.json', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/manifest.json', testInfo);
    const json = await response.json();
    expect(json.name || json.short_name).toBeTruthy();
    expect(Array.isArray(json.icons)).toBe(true);
  });

  test('/og-image.webp returns 200 image/webp', async ({ request }, testInfo) => {
    const response = await request.get('/og-image.webp', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/og-image.webp', testInfo);
    expect(response.headers()['content-type'] || '').toMatch(/image\/webp/i);
    const body = await response.body();
    // WebP files start with RIFF....WEBP
    expect(body.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(body.subarray(8, 12).toString('ascii')).toBe('WEBP');
  });

  test('/api/vitals accepts POST JSON (200/204)', async ({ request }, testInfo) => {
    const response = await request.post('/api/vitals', {
      failOnStatusCode: false,
      headers: withProbeHeaders({ 'content-type': 'application/json' }),
      data: { lcp: 1234, cls: 0.02, url: '/', timestamp: Date.now() },
    });
    skipIfLocalRateLimited(response, '/api/vitals', testInfo);
    expect([200, 204]).toContain(response.status());
  });

  test('/api/csp-violation accepts POST report (200/204)', async ({ request }, testInfo) => {
    const response = await request.post('/api/csp-violation', {
      failOnStatusCode: false,
      headers: withProbeHeaders({ 'content-type': 'application/csp-report' }),
      data: {
        'csp-report': {
          'document-uri': 'https://resume.jclee.me/',
          'violated-directive': 'script-src',
        },
      },
    });
    skipIfLocalRateLimited(response, '/api/csp-violation', testInfo);
    expect([200, 204]).toContain(response.status());
  });

  test('/api/auth/status returns 200 JSON for unauthenticated session', async ({
    request,
  }, testInfo) => {
    const response = await request.get('/api/auth/status', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/api/auth/status', testInfo);
    const json = await response.json();
    // Endpoint always returns JSON; shape includes authenticated flag.
    expect(json).toBeTruthy();
    expect(typeof json).toBe('object');
  });
});

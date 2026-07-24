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

test.describe('@deploy-verify Performance', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfEdgeProtectionBlocksRunner(request);
  });

  test('metrics endpoint returns Prometheus-compatible text', async ({ request }, testInfo) => {
    const response = await request.get('/metrics', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/metrics', testInfo);

    const body = await response.text();
    expect(body).toMatch(
      /#\s*HELP|#\s*TYPE|http_requests_total|http_response_time|vitals_received/
    );
  });

  test('response indicates transfer/compression behavior in headers', async ({
    request,
  }, testInfo) => {
    const response = await request.get('/', {
      failOnStatusCode: false,
      headers: withProbeHeaders({ 'accept-encoding': 'br, gzip' }),
    });

    expect200OrSkipLocalRateLimit(response, '/', testInfo);
    const headers = response.headers();
    const contentEncoding = headers['content-encoding'];
    const transferEncoding = headers['transfer-encoding'];

    expect(Boolean(contentEncoding || transferEncoding)).toBeTruthy();
  });

  test('static assets expose cache-control with max-age or immutable', async ({
    page,
    request,
  }, testInfo) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const candidateAsset = await page.evaluate(() => {
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'));
      for (const style of styles) {
        const href = style.getAttribute('href');
        if (href && !href.startsWith('http')) {
          return href;
        }
      }

      const scripts = Array.from(document.querySelectorAll('script[src]'));
      for (const script of scripts) {
        const src = script.getAttribute('src');
        if (src && !src.startsWith('http')) {
          return src;
        }
      }

      return '/og-image.webp';
    });

    const response = await request.get(candidateAsset || '/og-image.webp', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, candidateAsset || '/og-image.webp', testInfo);

    const cacheControl = response.headers()['cache-control'] || '';
    expect(cacheControl).toMatch(/max-age|immutable/i);
  });
});

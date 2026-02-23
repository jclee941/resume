import { test, expect } from '@playwright/test';

const TITLE_PATTERN = /이재철|Jaecheol|Resume|Portfolio/i;
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

function toAbsoluteUrl(baseURL, maybeRelativeUrl) {
  try {
    return new URL(maybeRelativeUrl, `${baseURL}/`).toString();
  } catch {
    return `${baseURL}/og-image.webp`;
  }
}

async function getHomeResponse(request) {
  return request.get('/', {
    failOnStatusCode: false,
    headers: withProbeHeaders(),
  });
}

async function getHomeHeaders(request) {
  const response = await getHomeResponse(request);
  return { response, headers: response.headers() };
}

async function skipIfEdgeProtectionBlocksRunner(request) {
  const response = await getHomeResponse(request);
  test.skip(
    response.status() === 403,
    'Edge protection blocks GitHub runner for production probes (HTTP 403)'
  );
}

test.describe('@deploy-verify Service Health', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfEdgeProtectionBlocksRunner(request);
  });

  test('portfolio health endpoint returns healthy JSON', async ({ request }) => {
    const response = await request.get('/health', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect(response.status()).toBe(200);

    const payload = await response.json();
    expect(payload).toBeTruthy();
    expect(payload.status).toBe('healthy');
    expect(payload.bindings).toBeTruthy();
    expect(payload.metrics).toBeTruthy();
  });

  test('job dashboard health endpoint is accessible when available', async ({ request }) => {
    const response = await request.get('/job/api/health', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    if ([404, 405, 501, 502, 503].includes(response.status())) {
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

  test('homepage response time stays under 3000ms', async ({ request }) => {
    const start = Date.now();
    const response = await request.get('/', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    const elapsedMs = Date.now() - start;

    expect(response.status()).toBe(200);
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

test.describe('@deploy-verify Content Integrity', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfEdgeProtectionBlocksRunner(request);
  });

  test('page title contains expected portfolio identity text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title).toMatch(TITLE_PATTERN);
  });

  test('Open Graph core tags are present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const ogKeys = ['og:title', 'og:description', 'og:image', 'og:url'];
    let presentCount = 0;
    for (const key of ogKeys) {
      const value = await page.locator(`meta[property="${key}"]`).first().getAttribute('content');
      if (value && value.trim()) {
        presentCount += 1;
      }
    }

    expect(presentCount).toBeGreaterThanOrEqual(4);
  });

  test('OG image URL is reachable and served as image', async ({ page, request }, testInfo) => {
    const baseURL = getBaseUrl(testInfo);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const ogImageContent = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute('content');

    expect(ogImageContent).toBeTruthy();

    const ogImageUrl = toAbsoluteUrl(baseURL, ogImageContent || '/og-image.webp');
    const ogImageResponse = await request.get(ogImageUrl, {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect(ogImageResponse.status()).toBe(200);
    expect(ogImageResponse.headers()['content-type'] || '').toMatch(/^image\//);
  });

  test('locale variant /en responds with English-oriented content', async ({ request }) => {
    const response = await request.get('/en', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toMatch(/Resume|Portfolio|Engineer|Projects/i);
  });
});

test.describe('@deploy-verify Performance', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfEdgeProtectionBlocksRunner(request);
  });

  test('metrics endpoint returns Prometheus-compatible text', async ({ request }) => {
    const response = await request.get('/metrics', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toMatch(
      /#\s*HELP|#\s*TYPE|http_requests_total|http_response_time|vitals_received/
    );
  });

  test('response indicates transfer/compression behavior in headers', async ({ request }) => {
    const response = await request.get('/', {
      failOnStatusCode: false,
      headers: withProbeHeaders({ 'accept-encoding': 'br, gzip' }),
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    const contentEncoding = headers['content-encoding'];
    const transferEncoding = headers['transfer-encoding'];

    expect(Boolean(contentEncoding || transferEncoding)).toBeTruthy();
  });

  test('static assets expose cache-control with max-age or immutable', async ({
    page,
    request,
  }) => {
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
    expect(response.status()).toBe(200);

    const cacheControl = response.headers()['cache-control'] || '';
    expect(cacheControl).toMatch(/max-age|immutable/i);
  });
});

test.describe('@deploy-verify API Endpoints', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfEdgeProtectionBlocksRunner(request);
  });

  test('robots.txt returns 200 and includes User-agent', async ({ request }) => {
    const response = await request.get('/robots.txt', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/user-agent/i);
  });

  test('sitemap.xml returns 200 with valid sitemap root', async ({ request }) => {
    const response = await request.get('/sitemap.xml', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toMatch(/<urlset|<sitemapindex/i);
  });

  test('metrics endpoint is reachable as API surface', async ({ request }) => {
    const response = await request.get('/metrics', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect(response.status()).toBe(200);

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
});

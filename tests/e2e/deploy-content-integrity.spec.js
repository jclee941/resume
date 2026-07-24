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

function isLocalBaseUrl(testInfo) {
  return /127\.0\.0\.1|localhost/.test(getBaseUrl(testInfo));
}

function toAbsoluteUrl(baseURL, maybeRelativeUrl) {
  try {
    return new URL(maybeRelativeUrl, `${baseURL}/`).toString();
  } catch {
    return `${baseURL}/og-image.webp`;
  }
}

async function getHomeResponse(request) {
  return request.get('/', { failOnStatusCode: false, headers: withProbeHeaders() });
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
    expect200OrSkipLocalRateLimit(ogImageResponse, '/og-image.webp', testInfo);
    expect(ogImageResponse.headers()['content-type'] || '').toMatch(/^image\//);
  });

  test('locale variant /en responds with English-oriented content', async ({ request }, testInfo) => {
    const response = await request.get('/en', {
      failOnStatusCode: false,
      headers: withProbeHeaders(),
    });
    expect200OrSkipLocalRateLimit(response, '/en', testInfo);

    const body = await response.text();
    expect(body).toMatch(/Resume|Portfolio|Engineer|Projects/i);
  });
});

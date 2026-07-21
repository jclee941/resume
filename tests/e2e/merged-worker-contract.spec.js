import { test, expect } from '@playwright/test';

const strictProduction = process.env.STRICT_PRODUCTION === '1';
const expectedGitSha = process.env.EXPECTED_GIT_SHA ?? '';
const fullGitSha = /^[0-9a-f]{40}$/u;

test.beforeAll(() => {
  if (strictProduction && !fullGitSha.test(expectedGitSha)) {
    throw new Error('STRICT_PRODUCTION=1 requires a 40-character EXPECTED_GIT_SHA');
  }
});

test('merged portfolio and job health routes are non-5xx', async ({ request }) => {
  for (const route of ['/health', '/job/health', '/job/api/health']) {
    const response = await request.get(route, { failOnStatusCode: false });
    expect(response.status(), `${route} must be available`).toBeLessThan(500);
  }
});

test('Queue reports a coherent capability contract', async ({ request }) => {
  // The endpoint mirrors the runtime binding: when the crawl-tasks producer is
  // bound (local miniflare and provisioned production) it reports available/200;
  // when unbound it degrades to the disabled/503 contract. Assert the invariant
  // that the HTTP status, `available`, and `status` string stay consistent —
  // never a hardcoded availability the environment may legitimately flip.
  const response = await request.get('/job/api/queue/status', { failOnStatusCode: false });
  const body = await response.json();
  expect(body.queue).toBe('crawl-tasks');

  if (body.available) {
    expect(response.status()).toBe(200);
    expect(body.status).toBe('ok');
  } else {
    expect(response.status()).toBe(503);
    expect(body.status).toBe('disabled');
  }
});

test('health exposes a full exact SHA contract', async ({ request }) => {
  const response = await request.get('/health', { failOnStatusCode: false });
  expect(response.status()).toBe(200);
  const health = await response.json();
  expect(health.git_sha).toMatch(fullGitSha);
  if (strictProduction) expect(health.git_sha).toBe(expectedGitSha);
});

test('job database health is connected', async ({ request }) => {
  for (const route of ['/job/health', '/job/api/health']) {
    const response = await request.get(route, { failOnStatusCode: false });
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok', database: 'connected' });
  }
});

for (const { locale, route } of [
  { locale: 'KO', route: '/' },
  { locale: 'EN', route: '/en/' },
]) {
  for (const width of [375, 1280]) {
    test(`@portfolio-render ${locale} ${width}px renders without errors or overflow`, async ({
      page,
    }) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });
      await page.setViewportSize({ width, height: 900 });

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

      expect(response?.status()).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      expect(errors).toEqual([]);
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    });
  }
}

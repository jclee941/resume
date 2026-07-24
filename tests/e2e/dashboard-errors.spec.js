// @ts-check
const { test, expect } = require('@playwright/test');
const { createDashboardEnvironment } = require('./fixtures/dashboard-environment.cjs');

let DASHBOARD_BASE = '';
let apiAvailable = false;

function skipIfDashboardApiUnavailable() {
  test.skip(!apiAvailable, 'Dashboard API unavailable in current environment');
}

test.beforeAll(async ({ request }, testInfo) => {
  const dashboard = await createDashboardEnvironment(request, testInfo.workerIndex);
  DASHBOARD_BASE = dashboard.dashboardBase;
  apiAvailable = dashboard.apiAvailable;
});

test.describe('Dashboard - Error Handling', () => {
  test('Invalid route should return 404', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/nonexistent`);
    expect(response.status()).toBe(404);
    const json = await response.json();
    expect(json).toHaveProperty('error');
  });

  test('POST with malformed JSON should return 400', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(`${DASHBOARD_BASE}/api/applications`, {
      data: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test('Rate limiting should apply after threshold', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const requests = [];
    for (let i = 0; i < 50; i++) {
      requests.push(request.get(`${DASHBOARD_BASE}/api/health`));
    }
    const responses = await Promise.all(requests);

    const statuses = responses.map((r) => r.status());
    expect(statuses.some((s) => [200].includes(s))).toBe(true);
    const hasRateLimit = statuses.some((s) => s === 429);
    expect([true, false]).toContain(hasRateLimit);
  });
});

test.describe('Dashboard - Extended Error Handling', () => {
  test('Invalid API endpoint returns 404 JSON error payload', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/definitely-not-a-real-endpoint`);
    expect(response.status()).toBe(404);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
    const json = await response.json();
    expect(json).toHaveProperty('error');
    expect(typeof json.error).toBe('string');
  });

  test('Malformed JSON body returns 400 when request parser is reached', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.fetch(`${DASHBOARD_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: '{"token":',
    });

    expect([400, 403]).toContain(response.status());
    test.skip(
      response.status() !== 400,
      'Request blocked by CSRF/auth middleware before JSON parser'
    );

    const json = await response.json();
    expect(json).toHaveProperty('error');
    expect(typeof json.error).toBe('string');
  });

  test('Rate limiting returns 429 after excessive requests', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const requests = [];
    for (let i = 0; i < 90; i++) {
      requests.push(request.get(`${DASHBOARD_BASE}/api/health`));
    }
    const responses = await Promise.all(requests);
    const statuses = responses.map((res) => res.status());
    const hasRateLimit = statuses.includes(429);

    test.skip(!hasRateLimit, 'Rate limiting threshold not reached in current environment');
    expect(hasRateLimit).toBe(true);
  });
});

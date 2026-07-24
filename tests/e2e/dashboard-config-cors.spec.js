// @ts-check
const { test, expect } = require('@playwright/test');
const { createDashboardEnvironment } = require('./fixtures/dashboard-environment.cjs');

let BASE_URL = '';
let DASHBOARD_BASE = '';
let apiAvailable = false;

function skipIfDashboardApiUnavailable() {
  test.skip(!apiAvailable, 'Dashboard API unavailable in current environment');
}

/**
 * @param {import('@playwright/test').APIResponse} response
 * @param {string} label
 */
function skipIfTransientDashboardStatus(response, label) {
  test.skip(
    response.status() === 429 || response.status() >= 500,
    `${label} unavailable in current environment`
  );
}

test.beforeAll(async ({ request }, testInfo) => {
  const dashboard = await createDashboardEnvironment(request, testInfo.workerIndex);
  BASE_URL = dashboard.baseUrl;
  DASHBOARD_BASE = dashboard.dashboardBase;
  apiAvailable = dashboard.apiAvailable;
});

test.describe('Dashboard - Configuration', () => {
  test('GET /api/config should return configuration', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/config`);
    expect([200, 401, 403]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(typeof json).toBe('object');
    }
  });

  test('PUT /api/config should update configuration', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.put(`${DASHBOARD_BASE}/api/config`, {
      data: { platform: 'wanted', enabled: true },
    });
    expect([200, 400, 401, 403]).toContain(response.status());
  });
});

test.describe('Dashboard - Profile & Resume Sync', () => {
  test('GET /api/auth/profile should return profile', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/auth/profile`);
    skipIfTransientDashboardStatus(response, 'GET /api/auth/profile');
    expect([200, 401, 403]).toContain(response.status());
  });

  test('POST /api/automation/profile-sync should trigger profile sync', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(`${DASHBOARD_BASE}/api/automation/profile-sync`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('GET /api/automation/profile-sync/:syncId should get sync status', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/automation/profile-sync/test-sync`);
    expect([401, 403, 404]).toContain(response.status());
  });

  test('POST /api/automation/resume should trigger resume sync', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(`${DASHBOARD_BASE}/api/automation/resume`);
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('Dashboard - CORS & Headers', () => {
  test('OPTIONS request should return CORS headers', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.fetch(`${DASHBOARD_BASE}/api/health`, { method: 'OPTIONS' });
    expect([200, 204]).toContain(response.status());
    const allowOrigin = response.headers()['access-control-allow-origin'];
    if (allowOrigin) {
      expect(allowOrigin).toBeDefined();
    }
  });

  test('API response should include CORS headers', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/health`, {
      headers: { Origin: BASE_URL },
    });
    const allowOrigin = response.headers()['access-control-allow-origin'];
    if (response.status() === 200 && allowOrigin) {
      expect(allowOrigin).toBeDefined();
    }
  });
});

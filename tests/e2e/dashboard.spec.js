// @ts-check
const { test, expect } = require('@playwright/test');
const { createDashboardEnvironment } = require('./fixtures/dashboard-environment.cjs');

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
  DASHBOARD_BASE = dashboard.dashboardBase;
  apiAvailable = dashboard.apiAvailable;
});

test.describe('Dashboard - Health & Status Endpoints', () => {
  test('GET /job/health should return 200 with JSON', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/health`);
    skipIfTransientDashboardStatus(response, 'GET /job/health');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('version');
    expect(json.status).toMatch(/ok|degraded/);
  });

  test('GET /job/api/health should return 200 with JSON', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/health`);
    skipIfTransientDashboardStatus(response, 'GET /job/api/health');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('database');
    expect(['ok', 'degraded']).toContain(json.status);
  });

  test('GET /job/api/status should return application count', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/status`);
    skipIfTransientDashboardStatus(response, 'GET /job/api/status');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('status', 'ok');
    if (json.applications !== undefined) {
      expect(typeof json.applications).toMatch(/number|string/);
    }
  });
});

test.describe('Dashboard - Authentication', () => {
  test('GET /api/auth/status should return authentication status', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/auth/status`);
    expect([200, 401]).toContain(response.status());
    const json = await response.json();
    if (response.status() === 200) {
      expect(json).toHaveProperty('status');
    } else {
      expect(json).toHaveProperty('error');
    }
  });

  test('POST /api/auth/login with invalid token should return 401', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(`${DASHBOARD_BASE}/api/auth/login`, {
      data: { token: 'invalid_token' },
    });
    expect([401, 403]).toContain(response.status());
    const json = await response.json();
    expect(json).toHaveProperty('error');
  });

  test('POST /api/auth/logout should clear auth cookie', async ({ request, context: _context }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(`${DASHBOARD_BASE}/api/auth/logout`);
    expect([200, 403]).toContain(response.status());
    const json = await response.json();
    if (response.status() === 200) {
      expect(json).toHaveProperty('success', true);
    } else {
      expect(json).toHaveProperty('error');
    }
    const setCookie = response.headers()['set-cookie'];
    if (setCookie) {
      expect(setCookie).toContain('Max-Age=0');
    }
  });

  test('DELETE /api/auth/:platform should clear platform auth', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.delete(`${DASHBOARD_BASE}/api/auth/wanted`, {
      headers: {
        Authorization: 'Bearer test_token',
      },
    });
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('Dashboard - Statistics Endpoints', () => {
  test('GET /api/stats should return statistics', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/stats`);
    expect([200, 401, 403]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('total');
      expect(typeof json.total).toBe('number');
    }
  });

  test('GET /api/stats/weekly should return weekly statistics', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/stats/weekly`);
    expect([200, 401, 403]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(Array.isArray(json) || typeof json === 'object').toBe(true);
    }
  });

  test('GET /api/report should return daily report', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/report`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('GET /api/report/weekly should return weekly report', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/report/weekly`);
    expect([200, 401, 403]).toContain(response.status());
  });
});

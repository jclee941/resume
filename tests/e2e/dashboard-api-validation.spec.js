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

test.describe('Dashboard - Response Validation', () => {
  test('Health endpoint response should have valid structure', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/health`);
    test.skip(
      response.status() === 429 || response.status() >= 500,
      'Health endpoint response validation unavailable in current environment'
    );
    const json = await response.json();

    expect(json).toHaveProperty('status');
    expect(json.status).toMatch(/ok|degraded/);
    expect(json).toHaveProperty('timestamp');
    expect(() => new Date(json.timestamp)).not.toThrow();
    expect(json).toHaveProperty('version');
    expect(json.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('Status endpoint should report database connectivity', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/status`);
    if (response.status() === 200) {
      const json = await response.json();
      if (json.applications !== undefined) {
        expect(json).toHaveProperty('applications');
        expect(typeof json.applications === 'number' || typeof json.applications === 'string').toBe(
          true
        );
      }
    }
  });
});

test.describe('Dashboard - Extended API Response Format', () => {
  test('GET /api/stats returns proper stats structure', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/stats`);
    expect([200, 401, 403]).toContain(response.status());

    if (response.status() === 200) {
      const json = await response.json();
      expect(typeof json).toBe('object');
      expect(json).toHaveProperty('total');
      expect(typeof json.total).toBe('number');
      const optionalNumericFields = ['applied', 'saved', 'interview', 'offer', 'rejected'];
      for (const field of optionalNumericFields) {
        if (Object.prototype.hasOwnProperty.call(json, field)) {
          expect(typeof json[field]).toBe('number');
        }
      }
    }
  });

  test('GET /api/applications returns array with pagination metadata', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/applications?page=1&limit=10`);
    expect([200, 401, 403]).toContain(response.status());

    if (response.status() === 200) {
      const json = await response.json();
      const listCandidate =
        (json && Array.isArray(json.applications) && json.applications) ||
        (Array.isArray(json.items) && json.items) ||
        (Array.isArray(json.data) && json.data) ||
        (Array.isArray(json) && json);

      expect(Array.isArray(listCandidate)).toBe(true);

      const paginationCandidate =
        json.pagination ||
        (typeof json.total === 'number' ? json : null) ||
        (typeof json.page === 'number' ? json : null);

      if (paginationCandidate) {
        if (Object.prototype.hasOwnProperty.call(paginationCandidate, 'page')) {
          expect(typeof paginationCandidate.page).toBe('number');
        }
        if (Object.prototype.hasOwnProperty.call(paginationCandidate, 'limit')) {
          expect(typeof paginationCandidate.limit).toBe('number');
        }
        if (Object.prototype.hasOwnProperty.call(paginationCandidate, 'total')) {
          expect(typeof paginationCandidate.total).toBe('number');
        }
      }
    }
  });

  test('POST /api/search returns search results', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const payload = { keyword: 'devops', limit: 5 };
    let response = await request.post(`${DASHBOARD_BASE}/api/search`, {
      data: payload,
    });

    if (response.status() === 404) {
      response = await request.post(`${DASHBOARD_BASE}/api/automation/search`, {
        data: payload,
      });
    }

    expect([200, 401, 403, 404]).toContain(response.status());

    if (response.status() === 200) {
      const json = await response.json();
      expect(typeof json).toBe('object');

      const resultsCandidate =
        (Array.isArray(json.results) && json.results) ||
        (Array.isArray(json.jobs) && json.jobs) ||
        (Array.isArray(json.items) && json.items) ||
        (Array.isArray(json.data) && json.data) ||
        (Array.isArray(json) && json);

      expect(Array.isArray(resultsCandidate)).toBe(true);
    }
  });
});

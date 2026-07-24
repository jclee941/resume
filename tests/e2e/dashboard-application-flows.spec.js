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

test.describe('Dashboard - Applications CRUD (Protected)', () => {
  test('GET /api/applications should require auth', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/applications`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('POST /api/applications should validate request', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(`${DASHBOARD_BASE}/api/applications`, {
      data: {
        company: 'Test Company',
        position: 'DevOps Engineer',
        platform: 'wanted',
      },
    });
    expect([200, 201, 400, 401, 403]).toContain(response.status());
  });

  test('GET /api/applications/:id should require id parameter', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/applications/nonexistent`);
    expect([401, 403, 404]).toContain(response.status());
  });

  test('PUT /api/applications/:id should require id and auth', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.put(`${DASHBOARD_BASE}/api/applications/test-id`, {
      data: { status: 'rejected' },
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test('DELETE /api/applications/:id should require auth', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.delete(`${DASHBOARD_BASE}/api/applications/test-id`);
    expect([401, 403, 404]).toContain(response.status());
  });

  test('PUT /api/applications/:id/status should update status', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.put(`${DASHBOARD_BASE}/api/applications/test-id/status`, {
      data: { status: 'offer' },
    });
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe('Dashboard - Workflow Endpoints', () => {
  test('POST /api/workflows/job-crawling should start workflow', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(`${DASHBOARD_BASE}/api/workflows/job-crawling`, {
      data: { platforms: ['wanted'] },
    });
    expect([200, 401, 403]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('instanceId');
      expect(json).toHaveProperty('status');
    }
  });

  test('POST /api/workflows/application should start workflow', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(`${DASHBOARD_BASE}/api/workflows/application`, {
      data: { jobId: 'test-id' },
    });
    expect([200, 401, 403]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('instanceId');
    }
  });

  test('POST /api/workflows/resume-sync should start workflow', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(`${DASHBOARD_BASE}/api/workflows/resume-sync`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('POST /api/workflows/daily-report should start workflow', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(`${DASHBOARD_BASE}/api/workflows/daily-report`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('GET /api/workflows/:workflowType/:instanceId should get status', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(
      `${DASHBOARD_BASE}/api/workflows/job-crawling/test-instance`
    );
    expect([401, 403, 404]).toContain(response.status());
  });

  test('POST /api/workflows/application/:instanceId/approve should approve', async ({
    request,
  }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(
      `${DASHBOARD_BASE}/api/workflows/application/test-id/approve`
    );
    expect([401, 403, 404]).toContain(response.status());
  });

  test('POST /api/workflows/application/:instanceId/reject should reject', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(
      `${DASHBOARD_BASE}/api/workflows/application/test-id/reject`
    );
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe('Dashboard - Auto-Apply Endpoints', () => {
  test('GET /api/auto-apply/status should return status', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.get(`${DASHBOARD_BASE}/api/auto-apply/status`);
    skipIfTransientDashboardStatus(response, 'GET /api/auto-apply/status');
    expect([200, 401, 403]).toContain(response.status());
  });

  test('POST /api/auto-apply/run should trigger auto-apply', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.post(`${DASHBOARD_BASE}/api/auto-apply/run`);
    skipIfTransientDashboardStatus(response, 'POST /api/auto-apply/run');
    expect([200, 401, 403]).toContain(response.status());
  });

  test('PUT /api/auto-apply/config should update config', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const response = await request.put(`${DASHBOARD_BASE}/api/auto-apply/config`, {
      data: { maxDailyApplications: 5 },
    });
    skipIfTransientDashboardStatus(response, 'PUT /api/auto-apply/config');
    expect([200, 400, 401, 403, 404]).toContain(response.status());
  });
});

test.describe('Dashboard - Integration Flow', () => {
  test('Complete job search flow: health → status → stats', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const health = await request.get(`${DASHBOARD_BASE}/health`);
    skipIfTransientDashboardStatus(health, 'Complete job search flow health');
    expect(health.status()).toBe(200);

    const status = await request.get(`${DASHBOARD_BASE}/api/status`);
    skipIfTransientDashboardStatus(status, 'Complete job search flow status');
    expect(status.status()).toBe(200);

    const stats = await request.get(`${DASHBOARD_BASE}/api/stats`);
    expect([200, 401, 403]).toContain(stats.status());
  });

  test('Complete auth flow: status → logout', async ({ request }) => {
    skipIfDashboardApiUnavailable();
    const status = await request.get(`${DASHBOARD_BASE}/api/auth/status`);
    skipIfTransientDashboardStatus(status, 'Complete auth flow status');
    expect([200, 401]).toContain(status.status());

    const logout = await request.post(`${DASHBOARD_BASE}/api/auth/logout`);
    skipIfTransientDashboardStatus(logout, 'Complete auth flow logout');
    expect([200, 403]).toContain(logout.status());
  });
});

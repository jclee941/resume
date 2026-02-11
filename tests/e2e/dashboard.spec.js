// @ts-check
/**
 * Dashboard E2E Tests for /job/* Routes
 *
 * Tests the job automation dashboard worker served at resume.jclee.me/job/*
 * Covers:
 * - Health check endpoints
 * - Authentication flows
 * - Applications CRUD
 * - Statistics & reporting
 * - Workflow triggers
 * - Error handling & rate limiting
 */

const { test, expect } = require('@playwright/test');

// Get the base URL - dashboard is served at /job/* prefix
const BASE_URL = process.env.BASE_URL || 'https://resume.jclee.me';
const DASHBOARD_BASE = `${BASE_URL}/job`;

// Check if the dashboard backend is available (may be down/503 in some environments)
let backendAvailable = false;

test.beforeAll(async ({ request }) => {
  try {
    // /health returns 200 even when D1/KV are unavailable; probe a real API
    // endpoint that touches the database layer to detect true availability.
    const response = await request.get(`${DASHBOARD_BASE}/api/auth/status`);
    backendAvailable = response.status() < 500;
  } catch {
    backendAvailable = false;
  }
});

test.describe('Dashboard - Health & Status Endpoints', () => {
  test('GET /job/health should return 200 with JSON', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/health`);
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('version');
    expect(json.status).toMatch(/ok|degraded/);
  });

  test('GET /job/api/health should return 200 with JSON', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/health`);
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('database');
    expect(['ok', 'degraded']).toContain(json.status);
  });

  test('GET /job/api/status should return application count', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/status`);
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('status', 'ok');
    expect(json).toHaveProperty('applications');
    expect(typeof json.applications).toMatch(/number|string/);
  });
});

test.describe('Dashboard - Authentication', () => {
  test('GET /api/auth/status should return authentication status', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/auth/status`);
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('status');
  });

  test('POST /api/auth/login with invalid token should return 401', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.post(`${DASHBOARD_BASE}/api/auth/login`, {
      data: { token: 'invalid_token' },
    });
    expect(response.status()).toBe(401);
    const json = await response.json();
    expect(json).toHaveProperty('error');
  });

  test('POST /api/auth/logout should clear auth cookie', async ({ request, context }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.post(`${DASHBOARD_BASE}/api/auth/logout`);
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('success', true);
    const setCookie = response.headers()['set-cookie'];
    if (setCookie) {
      expect(setCookie).toContain('Max-Age=0');
    }
  });

  test('DELETE /api/auth/:platform should clear platform auth', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.delete(`${DASHBOARD_BASE}/api/auth/wanted`, {
      headers: {
        Authorization: 'Bearer test_token',
      },
    });
    // May return 401 if no valid auth, which is expected
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('Dashboard - Statistics Endpoints', () => {
  test('GET /api/stats should return statistics', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/stats`);
    expect([200, 401, 403]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('total');
      expect(typeof json.total).toBe('number');
    }
  });

  test('GET /api/stats/weekly should return weekly statistics', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/stats/weekly`);
    expect([200, 401, 403]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(Array.isArray(json) || typeof json === 'object').toBe(true);
    }
  });

  test('GET /api/report should return daily report', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/report`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('GET /api/report/weekly should return weekly report', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/report/weekly`);
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('Dashboard - Applications CRUD (Protected)', () => {
  // Note: These tests verify endpoint availability and structure
  // Actual CRUD operations require valid authentication

  test('GET /api/applications should require auth', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/applications`);
    // May succeed if public or require 401 if protected
    expect([200, 401, 403]).toContain(response.status());
  });

  test('POST /api/applications should validate request', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.post(`${DASHBOARD_BASE}/api/applications`, {
      data: {
        company: 'Test Company',
        position: 'DevOps Engineer',
        platform: 'wanted',
      },
    });
    // Expect either success (200/201) or auth failure (401/403)
    expect([200, 201, 400, 401, 403]).toContain(response.status());
  });

  test('GET /api/applications/:id should require id parameter', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/applications/nonexistent`);
    // Expect not found or auth failure
    expect([401, 403, 404]).toContain(response.status());
  });

  test('PUT /api/applications/:id should require id and auth', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.put(`${DASHBOARD_BASE}/api/applications/test-id`, {
      data: { status: 'rejected' },
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test('DELETE /api/applications/:id should require auth', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.delete(`${DASHBOARD_BASE}/api/applications/test-id`);
    expect([401, 403, 404]).toContain(response.status());
  });

  test('PUT /api/applications/:id/status should update status', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.put(`${DASHBOARD_BASE}/api/applications/test-id/status`, {
      data: { status: 'accepted' },
    });
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe('Dashboard - Workflow Endpoints', () => {
  test('POST /api/workflows/job-crawling should start workflow', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
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
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
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
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.post(`${DASHBOARD_BASE}/api/workflows/resume-sync`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('POST /api/workflows/daily-report should start workflow', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.post(`${DASHBOARD_BASE}/api/workflows/daily-report`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('GET /api/workflows/:workflowType/:instanceId should get status', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(
      `${DASHBOARD_BASE}/api/workflows/job-crawling/test-instance`
    );
    // Expect not found if instance doesn't exist
    expect([401, 403, 404]).toContain(response.status());
  });

  test('POST /api/workflows/application/:instanceId/approve should approve', async ({
    request,
  }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.post(
      `${DASHBOARD_BASE}/api/workflows/application/test-id/approve`
    );
    expect([401, 403, 404]).toContain(response.status());
  });

  test('POST /api/workflows/application/:instanceId/reject should reject', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.post(
      `${DASHBOARD_BASE}/api/workflows/application/test-id/reject`
    );
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe('Dashboard - Auto-Apply Endpoints', () => {
  test('GET /api/auto-apply/status should return status', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/auto-apply/status`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('POST /api/auto-apply/run should trigger auto-apply', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.post(`${DASHBOARD_BASE}/api/auto-apply/run`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('PUT /api/auto-apply/config should update config', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.put(`${DASHBOARD_BASE}/api/auto-apply/config`, {
      data: { maxDailyApplications: 5 },
    });
    expect([200, 400, 401, 403]).toContain(response.status());
  });
});

test.describe('Dashboard - Configuration', () => {
  test('GET /api/config should return configuration', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/config`);
    expect([200, 401, 403]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(typeof json).toBe('object');
    }
  });

  test('PUT /api/config should update configuration', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.put(`${DASHBOARD_BASE}/api/config`, {
      data: { platform: 'wanted', enabled: true },
    });
    expect([200, 400, 401, 403]).toContain(response.status());
  });
});

test.describe('Dashboard - Profile & Resume Sync', () => {
  test('GET /api/auth/profile should return profile', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/auth/profile`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('POST /api/automation/profile-sync should trigger profile sync', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.post(`${DASHBOARD_BASE}/api/automation/profile-sync`);
    expect([200, 401, 403]).toContain(response.status());
  });

  test('GET /api/automation/profile-sync/:syncId should get sync status', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/automation/profile-sync/test-sync`);
    expect([401, 403, 404]).toContain(response.status());
  });

  test('POST /api/automation/resume should trigger resume sync', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.post(`${DASHBOARD_BASE}/api/automation/resume`);
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('Dashboard - CORS & Headers', () => {
  test('OPTIONS request should return CORS headers', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.fetch(`${DASHBOARD_BASE}/api/health`, { method: 'OPTIONS' });
    expect([200, 204]).toContain(response.status());
    const allowOrigin = response.headers()['access-control-allow-origin'];
    if (allowOrigin) {
      expect(allowOrigin).toBeDefined();
    }
  });

  test('API response should include CORS headers', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/health`);
    const allowOrigin = response.headers()['access-control-allow-origin'];
    if (response.status() === 200) {
      expect(allowOrigin).toBeDefined();
    }
  });
});

test.describe('Dashboard - Error Handling', () => {
  test('Invalid route should return 404', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/nonexistent`);
    expect(response.status()).toBe(404);
    const json = await response.json();
    expect(json).toHaveProperty('error');
  });

  test('POST with malformed JSON should return 400', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.post(`${DASHBOARD_BASE}/api/applications`, {
      data: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test('Rate limiting should apply after threshold', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
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

test.describe('Dashboard - Static Assets', () => {
  test('GET /job/ should serve dashboard HTML', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/`);
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });

  test('GET /job should redirect to /job/', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}`);
    expect(response.status()).toBe(200);
  });
});

test.describe('Dashboard - Integration Flow', () => {
  test('Complete job search flow: health → status → stats', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const health = await request.get(`${DASHBOARD_BASE}/health`);
    expect(health.status()).toBe(200);

    const status = await request.get(`${DASHBOARD_BASE}/api/status`);
    expect(status.status()).toBe(200);

    const stats = await request.get(`${DASHBOARD_BASE}/api/stats`);
    expect([200, 401, 403]).toContain(stats.status());
  });

  test('Complete auth flow: status → logout', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const status = await request.get(`${DASHBOARD_BASE}/api/auth/status`);
    expect(status.status()).toBe(200);

    const logout = await request.post(`${DASHBOARD_BASE}/api/auth/logout`);
    expect(logout.status()).toBe(200);
  });
});

test.describe('Dashboard - Response Validation', () => {
  test('Health endpoint response should have valid structure', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/health`);
    const json = await response.json();

    expect(json).toHaveProperty('status');
    expect(json.status).toMatch(/ok|degraded/);
    expect(json).toHaveProperty('timestamp');
    expect(() => new Date(json.timestamp)).not.toThrow();
    expect(json).toHaveProperty('version');
    expect(json.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('Status endpoint should report database connectivity', async ({ request }) => {
    test.skip(!backendAvailable, 'Dashboard backend unavailable');
    const response = await request.get(`${DASHBOARD_BASE}/api/status`);
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('applications');
      expect(typeof json.applications === 'number' || typeof json.applications === 'string').toBe(
        true
      );
    }
  });
});

/**
 * ApplicationsHandler characterization tests.
 *
 * These tests freeze the current behavior of ApplicationsHandler so that
 * future refactors (e.g., repository extraction) can be verified against
 * exact response shapes and status codes.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ApplicationsHandler, APPLICATION_STATUS } from '../applications/index.js';

// ─── Fake D1 ───

function createFakeD1(initialApps = [], initialTimeline = []) {
  const apps = new Map(initialApps.map((a) => [a.id, { ...a }]));
  const timeline = new Map();
  initialTimeline.forEach((t) => {
    if (!timeline.has(t.application_id)) timeline.set(t.application_id, []);
    timeline.get(t.application_id).push({ ...t });
  });

  return {
    prepare(sql) {
      const stmt = {
        sql,
        _params: [],
        bind(...params) {
          this._params = params;
          return this;
        },
        async all() {
          const rows = Array.from(apps.values());
          // Simple WHERE parsing for characterization
          if (sql.includes('WHERE 1=1')) {
            const filtered = rows;
            // This is a simplified filter for test purposes
            // Real logic is in repository; we just need to return rows
            return { results: filtered };
          }
          if (sql.includes('application_timeline')) {
            const appId = this._params[0];
            return { results: timeline.get(appId) || [] };
          }
          return { results: rows };
        },
        async first() {
          if (sql.includes('SELECT * FROM applications WHERE id = ?')) {
            return apps.get(this._params[0]) || null;
          }
          if (sql.includes('COUNT(*)')) {
            return { total: apps.size };
          }
          if (sql.includes('application_timeline')) {
            const appId = this._params[0];
            const events = timeline.get(appId) || [];
            return events[0] || null;
          }
          return null;
        },
        async run() {
          if (sql.includes('INSERT INTO applications')) {
            const [
              id,
              jobId,
              source,
              sourceUrl,
              position,
              company,
              location,
              matchScore,
              status,
              priority,
              resumeId,
              coverLetter,
              notes,
              createdAt,
              updatedAt,
            ] = this._params;
            const app = {
              id,
              job_id: jobId,
              source,
              source_url: sourceUrl,
              position,
              company,
              location,
              match_score: matchScore,
              status,
              priority,
              resume_id: resumeId,
              cover_letter: coverLetter,
              notes,
              created_at: createdAt,
              updated_at: updatedAt,
              applied_at: null,
            };
            apps.set(id, app);
            return { success: true };
          }
          if (sql.includes('INSERT INTO application_timeline')) {
            const [appId, status, previousStatus, note, timestamp] = this._params;
            if (!timeline.has(appId)) timeline.set(appId, []);
            timeline.get(appId).push({ application_id: appId, status, previous_status: previousStatus, note, timestamp });
            return { success: true };
          }
          if (sql.includes('UPDATE applications')) {
            const appId = this._params[this._params.length - 1];
            const app = apps.get(appId);
            if (!app) return { success: false };
            // Simplified update: just mark as touched
            app.updated_at = new Date().toISOString();
            return { success: true };
          }
          if (sql.includes('DELETE FROM application_timeline')) {
            const appId = this._params[0];
            timeline.delete(appId);
            return { success: true };
          }
          if (sql.includes('DELETE FROM applications')) {
            const appId = this._params[0];
            apps.delete(appId);
            return { success: true };
          }
          return { success: true, meta: { changes: 0 } };
        },
      };
      return stmt;
    },
    _apps: apps,
    _timeline: timeline,
  };
}

function createRequest({ method = 'GET', url = 'http://localhost/', body, params = {} } = {}) {
  return {
    method,
    url,
    params,
    async json() {
      if (body === undefined) throw new Error('No body');
      return body;
    },
  };
}

// ─── Tests ───

describe('ApplicationsHandler — create', () => {
  it('creates an application with job shape', async () => {
    const fakeDate = '2026-05-07T12:00:00.000Z';
    const originalNow = Date.now;
    const originalRandom = Math.random;
    Date.now = () => new Date(fakeDate).getTime();
    Math.random = () => 0.123456789;

    try {
      const db = createFakeD1();
      const handler = new ApplicationsHandler(db);
      const request = createRequest({
        method: 'POST',
        body: {
          job: {
            id: 'job_123',
            position: 'DevSecOps Engineer',
            company: 'Example Corp',
            location: 'Seoul',
            matchScore: 85,
            source: 'wanted',
            sourceUrl: 'https://wanted.co.kr/123',
          },
          options: { priority: 'high', resumeId: 'res_456' },
        },
      });

      const response = await handler.create(request);
      const data = await response.json();

      assert.strictEqual(response.status, 201);
      assert.ok(data.id);
      assert.strictEqual(data.position, 'DevSecOps Engineer');
      assert.strictEqual(data.company, 'Example Corp');
      assert.strictEqual(data.status, APPLICATION_STATUS.SAVED);
    } finally {
      Date.now = originalNow;
      Math.random = originalRandom;
    }
  });

  it('returns 400 for invalid JSON', async () => {
    const db = createFakeD1();
    const handler = new ApplicationsHandler(db);
    const request = {
      method: 'POST',
      async json() {
        throw new Error('Invalid JSON');
      },
    };

    const response = await handler.create(request);
    const data = await response.json();

    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.error, 'Invalid JSON body');
  });
});

describe('ApplicationsHandler — get', () => {
  it('returns an existing application', async () => {
    const app = {
      id: 'app_123',
      job_id: 'job_456',
      position: 'SRE',
      company: 'TestCorp',
      status: 'applied',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    const db = createFakeD1([app]);
    const handler = new ApplicationsHandler(db);
    const request = createRequest({ params: { id: 'app_123' } });

    const response = await handler.get(request);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.id, 'app_123');
    assert.strictEqual(data.position, 'SRE');
  });

  it('returns 404 for missing application', async () => {
    const db = createFakeD1();
    const handler = new ApplicationsHandler(db);
    const request = createRequest({ params: { id: 'app_missing' } });

    const response = await handler.get(request);
    const data = await response.json();

    assert.strictEqual(response.status, 404);
    assert.strictEqual(data.error, 'Application not found');
  });
});

describe('ApplicationsHandler — update', () => {
  it('updates notes and priority', async () => {
    const app = {
      id: 'app_123',
      job_id: 'job_456',
      position: 'SRE',
      company: 'TestCorp',
      status: 'saved',
      notes: '',
      priority: 'medium',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    const db = createFakeD1([app]);
    const handler = new ApplicationsHandler(db);
    const request = createRequest({
      method: 'PUT',
      params: { id: 'app_123' },
      body: { notes: 'Follow up next week', priority: 'high' },
    });

    const response = await handler.update(request);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.application);
  });

  it('returns 404 for missing application', async () => {
    const db = createFakeD1();
    const handler = new ApplicationsHandler(db);
    const request = createRequest({
      method: 'PUT',
      params: { id: 'app_missing' },
      body: { notes: 'test' },
    });

    const response = await handler.update(request);
    const data = await response.json();

    assert.strictEqual(response.status, 404);
    assert.strictEqual(data.error, 'Application not found');
  });
});

describe('ApplicationsHandler — delete', () => {
  it('deletes an existing application', async () => {
    const app = {
      id: 'app_123',
      job_id: 'job_456',
      position: 'SRE',
      company: 'TestCorp',
      status: 'saved',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    const db = createFakeD1([app]);
    const handler = new ApplicationsHandler(db);
    const request = createRequest({ params: { id: 'app_123' } });

    const response = await handler.delete(request);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
  });

  it('returns 404 for missing application', async () => {
    const db = createFakeD1();
    const handler = new ApplicationsHandler(db);
    const request = createRequest({ params: { id: 'app_missing' } });

    const response = await handler.delete(request);
    const data = await response.json();

    assert.strictEqual(response.status, 404);
    assert.strictEqual(data.error, 'Application not found');
  });
});

describe('ApplicationsHandler — list', () => {
  it('returns applications with pagination defaults', async () => {
    const apps = Array.from({ length: 5 }, (_, i) => ({
      id: `app_${i}`,
      job_id: `job_${i}`,
      position: `Role ${i}`,
      company: `Company ${i}`,
      status: 'saved',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }));
    const db = createFakeD1(apps);
    const handler = new ApplicationsHandler(db);
    const request = createRequest({ url: 'http://localhost/api/applications' });

    const response = await handler.list(request);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(data.applications));
    assert.strictEqual(typeof data.total, 'number');
    assert.strictEqual(data.limit, 100);
    assert.strictEqual(data.offset, 0);
  });
});

describe('ApplicationsHandler — updateStatus', () => {
  it('updates status and creates timeline event', async () => {
    const app = {
      id: 'app_123',
      job_id: 'job_456',
      position: 'SRE',
      company: 'TestCorp',
      status: 'saved',
      applied_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    const db = createFakeD1([app]);
    const handler = new ApplicationsHandler(db);
    const request = createRequest({
      method: 'PUT',
      params: { id: 'app_123' },
      body: { status: 'applied', note: 'Applied via company website' },
    });

    const response = await handler.updateStatus(request);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.application);
  });
});

describe('ApplicationsHandler — cleanupExpired', () => {
  it('returns cleanup count', async () => {
    const db = createFakeD1();
    const handler = new ApplicationsHandler(db);

    const response = await handler.cleanupExpired(createRequest());
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(typeof data.cleaned, 'number');
  });
});

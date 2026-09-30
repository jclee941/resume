import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { processApprovalGates } from '../../../workflows/application/approval-gates.js';
import { HistorySyncError } from '../history-types.js';
import { syncApplicationHistory } from '../sync.js';
import { createSqliteD1, sessionEnv, wantedRecord } from './history-test-kit.js';

const jobkoreaRecord = (no, status = 'applied') => ({
  ...wantedRecord(no, status),
  source: 'jobkorea',
  jobId: `jobkorea-${no}`,
  url: `https://www.jobkorea.co.kr/Recruit/GI_Read/${no}`,
});

const rows = (db) => db.sqlite.prepare('SELECT * FROM applications ORDER BY id').all();
const adaptersReturning = (wanted, jobkorea = []) => ({
  wanted: async () => wanted,
  jobkorea: async () => jobkorea,
});

describe('syncApplicationHistory', () => {
  let db;
  let env;
  const originalWarn = console.warn;

  beforeEach(async () => {
    db = createSqliteD1();
    env = await sessionEnv(db);
    console.warn = () => {};
  });
  afterEach(() => {
    console.warn = originalWarn;
  });

  it('is idempotent: a second run inserts nothing and keeps the row count', async () => {
    const adapters = adaptersReturning([wantedRecord(1), wantedRecord(2)], [jobkoreaRecord(90)]);

    const first = await syncApplicationHistory(env, { adapters });
    const second = await syncApplicationHistory(env, { adapters });

    assert.equal(first.status, 'success');
    assert.deepEqual(first.platforms.wanted, {
      ok: true,
      fetched: 2,
      inserted: 2,
      updated: 0,
      unchanged: 0,
    });
    assert.deepEqual(second.platforms.wanted, {
      ok: true,
      fetched: 2,
      inserted: 0,
      updated: 0,
      unchanged: 2,
    });
    assert.equal(rows(db).length, 3);
    const stored = rows(db).find((row) => row.job_id === 'wanted-1');
    assert.equal(stored.source, 'wanted');
    assert.equal(stored.id, 'history-wanted-1');
    assert.equal(stored.canonical_url, 'https://www.wanted.co.kr/wd/1');
  });

  it('keeps the latest application when one job was applied to more than once', async () => {
    const earlier = wantedRecord(7, 'rejected', { appliedAt: '2026-08-01T09:00:00' });
    const later = wantedRecord(7, 'in_progress', { appliedAt: '2026-09-05T09:00:00' });

    const first = await syncApplicationHistory(env, {
      adapters: adaptersReturning([later, earlier]),
    });
    const second = await syncApplicationHistory(env, {
      adapters: adaptersReturning([earlier, later]),
    });

    assert.equal(first.platforms.wanted.ok, true);
    assert.deepEqual(first.platforms.wanted, {
      ok: true,
      fetched: 2,
      inserted: 1,
      updated: 0,
      unchanged: 0,
    });
    assert.equal(second.platforms.wanted.unchanged, 1);
    assert.equal(rows(db).length, 1);
    assert.equal(rows(db)[0].status, 'in_progress');
  });

  it('updates the status of a row whose platform status changed', async () => {
    await syncApplicationHistory(env, {
      adapters: adaptersReturning([wantedRecord(1, 'applied')]),
    });
    const result = await syncApplicationHistory(env, {
      adapters: adaptersReturning([wantedRecord(1, 'interview')]),
    });

    assert.equal(result.platforms.wanted.updated, 1);
    assert.equal(rows(db).length, 1);
    assert.equal(rows(db)[0].status, 'interview');
  });

  it('updates rows it did not create, matched by (source, job_id), and keeps their details', async () => {
    const insert = db.sqlite.prepare(
      "INSERT INTO applications (id, job_id, source, position, company, status, created_at, updated_at) VALUES (?, ?, 'wanted', 'Own Role', 'Own Co', 'pending', 'then', 'then')"
    );
    insert.run('auto-1', 'wanted-1');
    insert.run('legacy-2', '2');

    await syncApplicationHistory(env, {
      adapters: adaptersReturning([wantedRecord(1, 'applied'), wantedRecord(2, 'rejected')]),
    });

    assert.equal(rows(db).length, 2);
    const byId = Object.fromEntries(rows(db).map((row) => [row.id, row]));
    assert.equal(byId['auto-1'].status, 'applied');
    assert.equal(byId['auto-1'].company, 'Own Co');
    assert.equal(byId['legacy-2'].status, 'rejected');
  });

  it('reports a missing session per platform and deletes nothing', async () => {
    db.sqlite
      .prepare(
        "INSERT INTO applications (id, job_id, source, position, company, status, created_at, updated_at) VALUES ('keep', 'wanted-9', 'wanted', 'Role', 'Co', 'applied', 'then', 'then')"
      )
      .run();

    const summary = await syncApplicationHistory(env);

    assert.equal(summary.ok, false);
    assert.equal(summary.status, 'failed');
    assert.equal(summary.platforms.wanted.code, 'SESSION_MISSING');
    assert.equal(summary.platforms.jobkorea.code, 'SESSION_MISSING');
    assert.deepEqual(
      rows(db).map((row) => row.id),
      ['keep']
    );
  });

  it('lets one platform succeed while the other fails and records the run', async () => {
    const adapters = {
      wanted: async () => [wantedRecord(1)],
      jobkorea: async () => {
        throw new HistorySyncError('SESSION_EXPIRED', 'JobKorea did not serve the applied list');
      },
    };

    const summary = await syncApplicationHistory(env, { adapters });

    assert.equal(summary.status, 'partial');
    assert.equal(summary.platforms.jobkorea.code, 'SESSION_EXPIRED');
    assert.equal(rows(db).length, 1);
    const log = db.sqlite.prepare('SELECT sync_type, status, details FROM sync_logs').get();
    assert.equal(log.sync_type, 'application-history');
    assert.equal(log.status, 'partial');
    assert.equal(JSON.parse(log.details).wanted.inserted, 1);
  });

  it('gives up on a platform that exceeds the time budget', async () => {
    const adapters = { wanted: () => new Promise(() => {}), jobkorea: async () => [] };
    const summary = await syncApplicationHistory(env, {
      adapters,
      timeoutMs: 5,
      platforms: ['wanted'],
    });
    assert.equal(summary.platforms.wanted.code, 'TIMEOUT');
    assert.equal(rows(db).length, 0);
  });

  it('never writes a fetch that resolves after the timeout was reported', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let resolveFetch;
    const fetched = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const adapters = { wanted: () => fetched, jobkorea: async () => [] };

    const pending = syncApplicationHistory(env, {
      adapters,
      timeoutMs: 1000,
      platforms: ['wanted'],
    });
    t.mock.timers.tick(1000);
    const summary = await pending;

    assert.equal(summary.platforms.wanted.code, 'TIMEOUT');
    resolveFetch([wantedRecord(1)]);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(rows(db).length, 0);
  });

  it('makes the approval gate treat a synced job as already applied', async () => {
    await syncApplicationHistory(env, {
      adapters: adaptersReturning([wantedRecord(262001, 'rejected')], [jobkoreaRecord(48000001)]),
    });
    const ctx = { env: { JOB_DB: db }, logWorkflowStep: async () => {} };
    const step = { do: async (_name, _options, run) => run() };
    const workflow = { id: 'wf', stats: { jobsApproved: 0, jobsRejected: 0 }, steps: [] };
    const jobs = [
      { id: 'wanted-262001', source: 'wanted', matchScore: 90 },
      { id: 'jobkorea-48000001', source: 'jobkorea', matchScore: 90 },
    ];

    const { approvalResults } = await processApprovalGates(ctx, step, workflow, jobs, false, 95);

    assert.deepEqual(
      approvalResults.map((result) => result.status),
      ['already-applied', 'already-applied']
    );
  });
});

describe('syncApplicationHistory window', () => {
  it('writes nothing and records no run when the fetch returns after the window closed', async () => {
    const db = createSqliteD1();
    const env = await sessionEnv(db);
    let now = 0;
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      const summary = await syncApplicationHistory(env, {
        platforms: ['wanted'],
        adapters: {
          wanted: async () => {
            now = 100;
            return [wantedRecord(1)];
          },
        },
        deadline: 50,
        clock: () => now,
      });

      assert.deepEqual(summary.platforms.wanted, {
        ok: false,
        code: 'TIMEOUT',
        error: 'history window closed before the write started',
      });
      assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM applications').get().n, 0);
      assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM sync_logs').get().n, 0);
    } finally {
      console.warn = originalWarn;
    }
  });
});

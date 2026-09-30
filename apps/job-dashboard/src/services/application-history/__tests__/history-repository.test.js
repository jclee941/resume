import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { processApprovalGates } from '../../../workflows/application/approval-gates.js';
import { upsertApplicationHistory } from '../history-repository.js';
import { createSqliteD1, wantedRecord } from './history-test-kit.js';

const NOW = '2026-09-30T00:00:00.000Z';

describe('upsertApplicationHistory', () => {
  let db;
  const applications = () => db.sqlite.prepare('SELECT * FROM applications ORDER BY id').all();
  const seed = (id, jobId, status = 'pending') =>
    db.sqlite
      .prepare(
        "INSERT INTO applications (id, job_id, source, position, company, status, created_at, updated_at) VALUES (?, ?, 'wanted', 'Own Role', 'Own Co', ?, 'then', 'then')"
      )
      .run(id, jobId, status);

  beforeEach(() => {
    db = createSqliteD1();
  });

  it('rewrites a legacy bare job_id to the canonical key so the approval gate sees it', async () => {
    seed('legacy-2', '2');

    const counts = await upsertApplicationHistory(db, [wantedRecord(2, 'rejected')], NOW);

    assert.deepEqual(counts, { fetched: 1, inserted: 0, updated: 1, unchanged: 0 });
    assert.equal(applications().length, 1);
    const [row] = applications();
    assert.equal(row.id, 'legacy-2');
    assert.equal(row.job_id, 'wanted-2');
    assert.equal(row.status, 'rejected');
    assert.equal(row.company, 'Own Co');

    const ctx = {
      env: { JOB_DB: db },
      logWorkflowStep: async () => {},
      createApprovalRequest: async () => assert.fail('the gate must not create a request'),
    };
    const step = { do: async (_name, _options, run) => run() };
    const workflow = { id: 'wf', stats: { jobsApproved: 0, jobsRejected: 0 }, steps: [] };
    const job = { id: 'wanted-2', source: 'wanted', matchScore: 90 };

    const { approvalResults } = await processApprovalGates(ctx, step, workflow, [job], false, 95);

    assert.deepEqual(
      approvalResults.map((result) => result.status),
      ['already-applied']
    );
    const requests = db.sqlite.prepare('SELECT COUNT(*) AS n FROM approval_requests').get();
    assert.equal(requests.n, 0);
  });

  it('normalizes a legacy key whose status already matches and counts it as updated', async () => {
    seed('legacy-3', '3', 'applied');

    // No application time either, so the key rewrite is the only change.
    const record = wantedRecord(3, 'applied', { appliedAt: null });
    const counts = await upsertApplicationHistory(db, [record], NOW);

    assert.deepEqual(counts, { fetched: 1, inserted: 0, updated: 1, unchanged: 0 });
    const [row] = applications();
    assert.equal(row.job_id, 'wanted-3');
    assert.equal(row.updated_at, 'then');
  });

  it('survives two overlapping syncs of the same new record', async () => {
    const results = await Promise.all([
      upsertApplicationHistory(db, [wantedRecord(4)], NOW),
      upsertApplicationHistory(db, [wantedRecord(4)], NOW),
    ]);

    assert.equal(applications().length, 1);
    const sum = (key) => results.reduce((total, counts) => total + counts[key], 0);
    assert.deepEqual(
      { inserted: sum('inserted'), updated: sum('updated'), unchanged: sum('unchanged') },
      { inserted: 1, updated: 0, unchanged: 1 }
    );
  });

  it('keeps the second status when overlapping syncs insert one job with different statuses', async () => {
    const results = await Promise.all([
      upsertApplicationHistory(db, [wantedRecord(6, 'applied')], NOW),
      upsertApplicationHistory(db, [wantedRecord(6, 'rejected')], NOW),
    ]);

    const rows = applications();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'rejected');
    const sum = (key) => results.reduce((total, counts) => total + counts[key], 0);
    assert.deepEqual(
      { inserted: sum('inserted'), updated: sum('updated'), unchanged: sum('unchanged') },
      { inserted: 1, updated: 1, unchanged: 0 }
    );
  });

  it('lets the row stored under the canonical key win and leaves legacy duplicates alone', async () => {
    seed('legacy-5', '5');
    seed('canonical-5', 'wanted-5');

    const counts = await upsertApplicationHistory(db, [wantedRecord(5, 'rejected')], NOW);

    assert.deepEqual(counts, { fetched: 1, inserted: 0, updated: 1, unchanged: 0 });
    const byId = Object.fromEntries(applications().map((row) => [row.id, row]));
    assert.equal(byId['canonical-5'].status, 'rejected');
    assert.equal(byId['legacy-5'].job_id, '5');
    assert.equal(byId['legacy-5'].status, 'pending');
  });
});

describe('upsertApplicationHistory application time', () => {
  let db;
  const row = (id) => db.sqlite.prepare('SELECT * FROM applications WHERE id = ?').get(id);
  const seedJobKorea = (no, appliedAt) =>
    db.sqlite
      .prepare(
        "INSERT INTO applications (id, job_id, source, position, company, status, created_at, updated_at, applied_at) VALUES (?, ?, 'jobkorea', 'Role', 'Co', 'applied', ?, 'then', ?)"
      )
      .run(`history-jobkorea-${no}`, `jobkorea-${no}`, appliedAt, appliedAt);
  const jobkoreaRecord = (no, appliedAt) => ({
    source: 'jobkorea',
    jobId: `jobkorea-${no}`,
    company: 'Co',
    position: 'Role',
    url: `https://www.jobkorea.co.kr/Recruit/GI_Read/${no}`,
    appliedAt,
    status: 'applied',
  });

  beforeEach(() => {
    db = createSqliteD1();
  });

  it('replaces a bare date with the precise time once, then leaves the row alone', async () => {
    seedJobKorea(7, '2026-09-03');
    const record = jobkoreaRecord(7, '2026-09-03T05:15:30.000Z');

    const first = await upsertApplicationHistory(db, [record], NOW);
    const second = await upsertApplicationHistory(db, [record], NOW);

    assert.deepEqual(first, { fetched: 1, inserted: 0, updated: 1, unchanged: 0 });
    assert.deepEqual(second, { fetched: 1, inserted: 0, updated: 0, unchanged: 1 });
    const stored = row('history-jobkorea-7');
    assert.equal(stored.applied_at, '2026-09-03T05:15:30.000Z');
    assert.equal(stored.created_at, '2026-09-03T05:15:30.000Z');
    assert.equal(stored.status, 'applied');
  });

  it('never trades a precise time for a date', async () => {
    seedJobKorea(8, '2026-09-03T05:15:30.000Z');

    const counts = await upsertApplicationHistory(db, [jobkoreaRecord(8, '2026-09-03')], NOW);

    assert.deepEqual(counts, { fetched: 1, inserted: 0, updated: 0, unchanged: 1 });
    assert.equal(row('history-jobkorea-8').applied_at, '2026-09-03T05:15:30.000Z');
  });

  it('counts one update when overlapping syncs make the same date precise', async () => {
    seedJobKorea(9, '2026-09-03');
    const record = jobkoreaRecord(9, '2026-09-03T05:15:30.000Z');

    const results = await Promise.all([
      upsertApplicationHistory(db, [record], NOW),
      upsertApplicationHistory(db, [record], NOW),
    ]);

    const sum = (key) => results.reduce((total, counts) => total + counts[key], 0);
    assert.deepEqual([sum('updated'), sum('unchanged')], [1, 1]);
    assert.equal(row('history-jobkorea-9').applied_at, '2026-09-03T05:15:30.000Z');
  });

  it('fills a missing application time without touching an unrelated created_at', async () => {
    db.sqlite
      .prepare(
        "INSERT INTO applications (id, job_id, source, position, company, status, created_at, updated_at) VALUES ('own-10', 'wanted-10', 'wanted', 'Own Role', 'Own Co', 'applied', 'then', 'then')"
      )
      .run();

    const counts = await upsertApplicationHistory(db, [wantedRecord(10, 'applied')], NOW);

    assert.deepEqual(counts, { fetched: 1, inserted: 0, updated: 1, unchanged: 0 });
    assert.equal(row('own-10').applied_at, '2026-09-01T10:00:00');
    assert.equal(row('own-10').created_at, 'then');
  });
});

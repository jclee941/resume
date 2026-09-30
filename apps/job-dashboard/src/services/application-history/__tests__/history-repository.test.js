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

    const counts = await upsertApplicationHistory(db, [wantedRecord(3, 'applied')], NOW);

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

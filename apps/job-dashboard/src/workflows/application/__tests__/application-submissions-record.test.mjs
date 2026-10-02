import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSqliteD1 } from '../../../services/application-history/__tests__/history-test-kit.js';
import { upsertApplicationHistory } from '../../../services/application-history/history-repository.js';
import { submitApprovedApplications } from '../application-submissions.js';
import { recordApplication } from '../database.js';

const WORKFLOW_ID = 'workflow-integrity';
const APPLICATION_ID = `${WORKFLOW_ID}-remember-4242`;

const job = {
  id: 'remember-4242',
  source: 'remember',
  company: 'Example Co',
  position: 'Platform Engineer',
  sourceUrl: 'https://career.rememberapp.co.kr/job/posting/4242',
  matchScore: 81,
};

const step = { do: async (_name, _options, callback) => callback(), sleep: async () => {} };

function createCtx(submitResult, recorded) {
  return {
    generateCoverLetter: async () => 'cover letter',
    getResume: async (resumeId) => ({ id: resumeId }),
    submitApplication: async () => submitResult,
    recordApplication: async (record) => void recorded.push(record),
    logWorkflowStep: async () => {},
  };
}

describe('already-applied submission results', () => {
  for (const [label, submitResult] of [
    ['alreadyApplied flag', { success: false, alreadyApplied: true }],
    ['already_applied status', { success: false, status: 'already_applied' }],
  ]) {
    it(`records the job as applied for the ${label}`, async () => {
      const recorded = [];
      const workflow = { id: WORKFLOW_ID, stats: { jobsApplied: 0, jobsFailed: 0 }, steps: [] };

      const [result] = await submitApprovedApplications(
        createCtx(submitResult, recorded),
        step,
        workflow,
        [job],
        'resume-1',
        false,
        { explicitSubmit: true }
      );

      assert.equal(result.action, 'already_applied');
      assert.equal(result.success, true);
      assert.deepEqual(recorded, [
        {
          workflowId: WORKFLOW_ID,
          jobId: 'remember-4242',
          platform: 'remember',
          sourceUrl: job.sourceUrl,
          company: 'Example Co',
          position: 'Platform Engineer',
          resumeId: 'resume-1',
          coverLetter: 'cover letter',
          matchScore: 81,
          appliedNow: false,
        },
      ]);
    });
  }
});

describe('recordApplication', () => {
  const record = {
    workflowId: WORKFLOW_ID,
    jobId: 'remember-4242',
    platform: 'remember',
    sourceUrl: job.sourceUrl,
    company: 'Example Co',
    position: 'Platform Engineer',
    resumeId: 'resume-1',
    coverLetter: 'cover letter',
    matchScore: 81,
  };

  function createDb() {
    const db = createSqliteD1();
    db.sqlite
      .prepare('INSERT INTO application_workflows (id, started_at) VALUES (?, ?)')
      .run(WORKFLOW_ID, '2026-10-01T00:00:00.000Z');
    return { db, ctx: { env: { JOB_DB: db } } };
  }
  const readRow = (db) =>
    db.sqlite.prepare('SELECT * FROM applications WHERE id = ?').get(APPLICATION_ID);

  it('inserts an applied row with an application time', async () => {
    const { db, ctx } = createDb();
    await recordApplication(ctx, record);
    const row = readRow(db);
    assert.equal(row.status, 'applied');
    assert.ok(row.applied_at);
  });

  it('keeps the status and application time of an existing row when recorded again', async () => {
    const { db, ctx } = createDb();
    await recordApplication(ctx, record);
    db.sqlite
      .prepare(
        "UPDATE applications SET status = 'interview', applied_at = '2026-09-01T00:00:00.000Z' WHERE id = ?"
      )
      .run(APPLICATION_ID);

    await recordApplication(ctx, record);

    const row = readRow(db);
    assert.equal(row.status, 'interview');
    assert.equal(row.applied_at, '2026-09-01T00:00:00.000Z');
  });

  it('promotes an existing unapplied row to applied and fills its application time', async () => {
    const { db, ctx } = createDb();
    await recordApplication(ctx, record);
    db.sqlite
      .prepare("UPDATE applications SET status = 'pending', applied_at = NULL WHERE id = ?")
      .run(APPLICATION_ID);

    await recordApplication(ctx, record);

    const row = readRow(db);
    assert.equal(row.status, 'applied');
    assert.ok(row.applied_at);
  });

  it('leaves the time of a job found already applied empty for the history sync to fill', async () => {
    const { db, ctx } = createDb();
    await recordApplication(ctx, { ...record, appliedNow: false });
    assert.equal(readRow(db).applied_at, null);

    await upsertApplicationHistory(
      db,
      [
        {
          source: 'remember',
          jobId: 'remember-4242',
          company: 'Example Co',
          position: 'Platform Engineer',
          url: job.sourceUrl,
          appliedAt: '2026-09-01T01:00:00.000Z',
          status: 'applied',
        },
      ],
      '2026-10-02T12:00:00.000Z'
    );

    assert.equal(readRow(db).applied_at, '2026-09-01T01:00:00.000Z');
  });

  it('promotes a history row for the same job instead of adding a second row', async () => {
    const { db, ctx } = createDb();
    db.sqlite
      .prepare(
        `INSERT INTO applications (id, job_id, source, position, company, status, applied_at, created_at, updated_at)
         VALUES ('history-1', 'remember-4242', 'remember', 'Role', 'Example Co', 'applied', '2026-10-01T01:00:00.000Z', '2026-10-01', '2026-10-01')`
      )
      .run();

    await recordApplication(ctx, record);

    const rows = db.sqlite
      .prepare(
        "SELECT id, applied_at FROM applications WHERE source = 'remember' AND job_id = 'remember-4242'"
      )
      .all();
    assert.deepEqual(
      rows.map((row) => [row.id, row.applied_at]),
      [['history-1', '2026-10-01T01:00:00.000Z']]
    );
  });
});

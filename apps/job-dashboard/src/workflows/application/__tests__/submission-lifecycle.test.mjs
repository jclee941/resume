import assert from 'node:assert/strict';
import test from 'node:test';
import { submitApprovedApplications } from '../application-submissions.js';
import { createWorkflowRecord } from '../workflow-records.js';
import { runApplicationWorkflow } from '../workflow-runner.js';
import {
  lifecycleContext,
  lifecycleEvent,
  lifecycleJob,
  lifecycleStep,
} from './workflow-lifecycle-kit.mjs';

for (const alreadyApplied of [false, true]) {
  test(`record retries recover without repeating submission (already applied: ${alreadyApplied})`, async () => {
    const step = lifecycleStep();
    let submissions = 0;
    let records = 0;
    const { ctx } = lifecycleContext({
      async submitApplication() {
        submissions++;
        return alreadyApplied ? { status: 'already_applied' } : { success: true };
      },
      async recordApplication(record) {
        records++;
        if (records < 3) throw new Error('D1 temporarily unavailable');
        assert.equal(record.appliedNow === false, alreadyApplied);
      },
    });
    const workflow = createWorkflowRecord(lifecycleEvent(), 'manual');

    const results = await submitApprovedApplications(
      ctx,
      step,
      workflow,
      [lifecycleJob],
      'default',
      false
    );

    assert.equal(results[0].success, true);
    assert.equal(submissions, 1);
    assert.equal(records, 3);
    assert.equal(workflow.stats.jobsApplied, alreadyApplied ? 0 : 1);
    assert.equal(workflow.stats.jobsFailed, 0);
    assert.deepEqual(workflow.errors, []);
  });

  test(`exhausted record retries persist failure and replay can recover (already applied: ${alreadyApplied})`, async () => {
    const step = lifecycleStep();
    let records = 0;
    let available = false;
    const { ctx, observed } = lifecycleContext({
      async recordApplication() {
        records++;
        if (!available) throw new Error('D1 record unavailable');
      },
    });
    if (alreadyApplied) {
      ctx.submitApplication = async () => {
        observed.submissions++;
        return { alreadyApplied: true };
      };
    }
    const event = lifecycleEvent({ candidates: [lifecycleJob] });

    await assert.rejects(runApplicationWorkflow(ctx, event, step), /D1 record unavailable/);

    const failed = observed.states.at(-1);
    assert.equal(failed.status, 'failed');
    assert.ok(failed.completedAt);
    assert.equal(failed.stats.jobsApplied, alreadyApplied ? 0 : 1);
    assert.equal(failed.stats.jobsFailed, 0);
    assert.ok(failed.errors.some((error) => error.step === 'record-application'));
    assert.equal(records, 4);
    available = true;
    const recovered = await runApplicationWorkflow(ctx, event, step);
    assert.equal(recovered.success, true);
    assert.equal(observed.submissions, 1);
    assert.equal(records, 5);
    assert.equal(recovered.workflow.stats.jobsApplied, alreadyApplied ? 0 : 1);
    assert.deepEqual(recovered.workflow.errors, []);
  });
}

for (const success of [true, false]) {
  test(`completed submission replay reconstructs stats (success: ${success})`, async () => {
    const step = lifecycleStep();
    const { ctx, observed } = lifecycleContext();
    if (!success) {
      ctx.submitApplication = async () => {
        observed.submissions++;
        return { success: false, error: 'Submission rejected' };
      };
    }
    const run = async () => {
      const workflow = createWorkflowRecord(lifecycleEvent(), 'manual');
      await submitApprovedApplications(ctx, step, workflow, [lifecycleJob], 'default', false);
      return workflow;
    };
    await run();

    const replayed = await run();

    assert.equal(observed.submissions, 1);
    assert.equal(replayed.stats.jobsApplied, success ? 1 : 0);
    assert.equal(replayed.stats.jobsFailed, success ? 0 : 1);
    assert.equal(replayed.errors.length, success ? 0 : 1);
  });
}

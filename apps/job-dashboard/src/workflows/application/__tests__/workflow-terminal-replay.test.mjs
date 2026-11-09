import assert from 'node:assert/strict';
import test from 'node:test';
import { NotificationService } from '../../../services/notifications.js';
import { runApplicationWorkflow } from '../workflow-runner.js';
import {
  lifecycleContext,
  lifecycleEvent,
  lifecycleJob,
  lifecycleStep,
} from './workflow-lifecycle-kit.mjs';

test('record recovery followed by distinct notification failures preserves the current terminal state', async (t) => {
  let recordAvailable = false;
  let notificationError = new Error('Synthetic first notification failure');
  t.mock.method(NotificationService.prototype, 'sendTelegramNotification', async () => {
    if (notificationError) throw notificationError;
  });
  const { ctx, observed } = lifecycleContext({
    async recordApplication(record) {
      observed.records.push(record);
      if (!recordAvailable) throw new Error('Synthetic record unavailable');
    },
  });
  const step = lifecycleStep();
  const event = lifecycleEvent({ candidates: [lifecycleJob] });
  const failedWrites = () => observed.states.filter((state) => state.status === 'failed');

  await assert.rejects(runApplicationWorkflow(ctx, event, step), /Synthetic record unavailable/);
  assert.equal(failedWrites().length, 1);
  assert.ok(observed.states.at(-1).errors.some((entry) => entry.step === 'record-application'));
  recordAvailable = true;

  for (const message of [
    'Synthetic first notification failure',
    'Synthetic second notification failure',
  ]) {
    notificationError = new Error(message);
    await assert.rejects(
      runApplicationWorkflow(ctx, event, step),
      (error) => error === notificationError
    );
    const saved = observed.states.at(-1);
    assert.equal(saved.status, 'failed');
    assert.ok(saved.completedAt);
    assert.equal(saved.stats.jobsApplied, 1);
    assert.equal(saved.stats.jobsFailed, 0);
    assert.deepEqual(saved.errors, [{ step: 'run', error: message }]);
  }
  assert.equal(failedWrites().length, 3);
  assert.ok(observed.states.every((state) => state.status !== 'completed'));

  const savesBeforeSameFailure = observed.states.length;
  await assert.rejects(runApplicationWorkflow(ctx, event, step), /second notification failure/);
  assert.equal(observed.states.length, savesBeforeSameFailure);

  notificationError = null;
  const result = await runApplicationWorkflow(ctx, event, step);
  assert.equal(result.success, true);
  assert.equal(result.workflow.status, 'completed');
  assert.equal(observed.states.at(-1).status, 'completed');
  assert.deepEqual(result.workflow.errors, []);
  assert.deepEqual(observed.states.at(-1).errors, []);
  assert.equal(observed.submissions, 1);
  assert.equal(observed.records.length, 5);
  assert.equal(step.attempts[`apply-job-${lifecycleJob.id}`], 1);
  assert.equal(step.attempts['persist-completed-workflow'], 1);
  assert.ok(observed.states.at(-1).steps.some((entry) => entry.step === 'notify'));
});

for (const searchFailed of [false, true]) {
  test(`empty search notification recovers with the current persisted outcome (search failed: ${searchFailed})`, async (t) => {
    const expectedFirstSearches = Array(searchFailed ? 1 + 2 : 1).fill('wanted');
    const expectedReplaySearches = searchFailed ? expectedFirstSearches : [];
    const original = new Error('Synthetic search notification unavailable');
    let notificationAvailable = false;
    t.mock.method(NotificationService.prototype, 'sendTelegramNotification', async () => {
      if (!notificationAvailable) throw original;
    });
    const { ctx, observed } = lifecycleContext({
      async searchJobs(platform) {
        observed.searches.push(platform);
        if (searchFailed) throw new Error('Synthetic search unavailable');
        return [];
      },
    });
    const step = lifecycleStep();
    const event = lifecycleEvent();

    await assert.rejects(runApplicationWorkflow(ctx, event, step), (error) => error === original);
    assert.deepEqual(observed.searches, expectedFirstSearches);
    assert.equal(observed.states.at(-1).status, 'failed');
    assert.ok(observed.states.at(-1).errors.some((entry) => entry.error === original.message));
    const savedBeforeNotification = step.attempts['persist-search-outcome'];
    notificationAvailable = true;

    const result = await runApplicationWorkflow(ctx, event, step);
    assert.equal(result.success, !searchFailed);
    assert.equal(result.workflow.status, searchFailed ? 'failed' : 'completed');
    assert.equal(observed.states.at(-1).status, result.workflow.status);
    assert.equal(savedBeforeNotification, undefined);
    assert.deepEqual(observed.states.at(-1).errors, result.workflow.errors);
    assert.equal(result.workflow.errors.length, searchFailed ? 1 : 0);
    assert.ok(result.workflow.completedAt);
    assert.equal(observed.submissions, 0);
    assert.deepEqual(observed.records, []);
    assert.deepEqual(observed.searches, [...expectedFirstSearches, ...expectedReplaySearches]);
    assert.equal(step.attempts['persist-search-outcome'], 1);
  });
}

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

for (const mode of ['all-failed', 'empty', 'partial']) {
  test(`search ${mode} has an accurate terminal outcome on execution and replay`, async (t) => {
    const notifications = [];
    t.mock.method(NotificationService.prototype, 'sendTelegramNotification', async (message) => {
      notifications.push(message.text);
    });
    const step = lifecycleStep();
    const { ctx, observed } = lifecycleContext({
      async searchJobs(platform) {
        observed.searches.push(platform);
        if (mode === 'all-failed' || (mode === 'partial' && platform === 'remember')) {
          throw new Error(`${platform} unavailable`);
        }
        return mode === 'partial' ? [lifecycleJob] : [];
      },
    });
    const event = lifecycleEvent({ platforms: ['wanted', 'remember'], dryRun: true });
    const first = await runApplicationWorkflow(ctx, event, step);
    const replayed = await runApplicationWorkflow(ctx, event, step);

    for (const result of [first, replayed]) {
      assert.equal(result.success, mode !== 'all-failed');
      assert.equal(result.workflow.status, mode === 'all-failed' ? 'failed' : 'completed');
      assert.equal(
        result.workflow.errors.length,
        mode === 'all-failed' ? 2 : mode === 'partial' ? 1 : 0
      );
      assert.ok(result.workflow.completedAt);
    }
    assert.equal(observed.submissions, 0);
    assert.deepEqual(observed.searches, ['wanted', 'remember']);
    if (mode === 'all-failed') {
      assert.match(first.message, /search failed/i);
      assert.match(notifications[0], /failed/i);
      assert.doesNotMatch(notifications[0], /No jobs found/);
    }
  });
}

test('daily limit is a completed no-op without searching or submitting', async () => {
  const step = lifecycleStep();
  const { ctx, observed } = lifecycleContext({ getDailyApplicationCount: async () => 10 });

  const result = await runApplicationWorkflow(ctx, lifecycleEvent(), step);

  assert.equal(result.success, true);
  assert.equal(result.workflow.status, 'completed');
  assert.ok(result.workflow.completedAt);
  assert.match(result.message, /Daily limit reached/);
  assert.ok(result.workflow.steps.some((entry) => entry.step === 'daily-limit-reached'));
  assert.deepEqual(observed.searches, []);
  assert.equal(observed.submissions, 0);
  assert.equal(step.attempts['check-daily-limits'], 1);
  assert.equal(observed.states.at(-1).status, 'completed');
});

for (const failPersistence of [false, true]) {
  test(`post-init errors propagate the original error with terminal persistence (save fails: ${failPersistence})`, async () => {
    const step = lifecycleStep();
    const original = new Error('Daily count unavailable');
    const { ctx, observed } = lifecycleContext({
      async getDailyApplicationCount() {
        throw original;
      },
      async saveWorkflowState(workflow) {
        observed.states.push(structuredClone(workflow));
        if (failPersistence && workflow.status === 'failed') {
          throw new Error('Terminal save unavailable');
        }
      },
    });

    await assert.rejects(
      runApplicationWorkflow(ctx, lifecycleEvent(), step),
      (error) => error === original
    );

    const failed = observed.states.at(-1);
    assert.equal(failed.status, 'failed');
    assert.ok(failed.completedAt);
    assert.ok(failed.errors.some((entry) => entry.error === original.message));
    const failureSteps = Object.keys(step.attempts).filter((name) =>
      /^persist-failed-workflow-[a-f0-9]{64}$/.test(name)
    );
    assert.equal(failureSteps.length, 1);
    assert.equal(step.attempts[failureSteps[0]], failPersistence ? 4 : 1);
  });
}

test('notification failure after completion persists failed and propagates platform failure', async (t) => {
  const original = new Error('Notification unavailable');
  t.mock.method(NotificationService.prototype, 'sendTelegramNotification', async () => {
    throw original;
  });
  const { ctx, observed } = lifecycleContext();
  const step = lifecycleStep();

  await assert.rejects(
    runApplicationWorkflow(ctx, lifecycleEvent(), step),
    (error) => error === original
  );

  assert.equal(observed.states.at(-1).status, 'failed');
  assert.ok(observed.states.at(-1).completedAt);
  const failureSteps = Object.keys(step.attempts).filter((name) =>
    /^persist-failed-workflow-[a-f0-9]{64}$/.test(name)
  );
  assert.equal(failureSteps.length, 1);
  assert.equal(step.attempts[failureSteps[0]], 1);
});

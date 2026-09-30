import assert from 'node:assert/strict';
import test from 'node:test';

import { processApprovalGates } from '../approval-gates.js';
import { searchWorkflowJobs } from '../job-search-and-scoring.js';

/**
 * Step mock that mirrors Cloudflare Workflows: any step API invoked while a
 * step.do callback is executing throws, and a failing callback is retried up
 * to `options.retries.limit` times.
 */
function createStepMock() {
  let depth = 0;
  const calls = [];
  const guard = (api, name) => {
    if (depth > 0) throw new Error(`step.${api}('${name}') called inside a step.do callback`);
    calls.push({ api, name });
  };
  return {
    calls,
    async do(name, options, callback) {
      guard('do', name);
      const limit = options?.retries?.limit ?? 0;
      for (let attempt = 0; ; attempt++) {
        depth++;
        try {
          return await callback();
        } catch (error) {
          if (attempt >= limit) throw error;
        } finally {
          depth--;
        }
      }
    },
    async sleep(name) {
      guard('sleep', name);
    },
    async sleepUntil(name) {
      guard('sleepUntil', name);
    },
    async waitForEvent(name) {
      guard('waitForEvent', name);
    },
  };
}

function createApprovalContext({ statuses = {}, failCreateOnce = [], failNotifyOnce = [] } = {}) {
  const created = [];
  const notifications = [];
  const pendingFailures = { create: new Set(failCreateOnce), notify: new Set(failNotifyOnce) };
  return {
    created,
    notifications,
    env: {
      JOB_DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) },
    },
    async createApprovalRequest(workflowId, job, status) {
      if (pendingFailures.create.delete(job.id)) throw new Error(`create failed for ${job.id}`);
      created.push({ jobId: job.id, status });
      return `approval-${workflowId}-${job.id}`;
    },
    async sendApprovalRequestNotification(_workflowId, requestId, job) {
      if (pendingFailures.notify.delete(job.id)) throw new Error(`notify failed for ${job.id}`);
      notifications.push({ requestId, jobId: job.id });
    },
    async getApprovalStatus(requestId) {
      return statuses[requestId] ?? 'pending';
    },
    async logWorkflowStep() {},
  };
}

const newWorkflow = () => ({
  id: 'wf-1',
  stats: { jobsApproved: 0, jobsRejected: 0 },
  steps: [],
});

const jobOf = (id, matchScore) => ({ id, source: 'wanted', matchScore, position: 'SRE' });

test('approval gates never call a step API inside a step.do callback', async () => {
  const step = createStepMock();
  const ctx = createApprovalContext();
  const jobs = [jobOf('a', 80), jobOf('b', 65), jobOf('c', 40)];

  const { approvalResults } = await processApprovalGates(ctx, step, newWorkflow(), jobs, false, 90);

  assert.deepEqual(
    approvalResults.map((result) => result.status),
    ['approved', 'pending', 'rejected']
  );
});

test('three pending jobs produce exactly one sleep and one resolve step', async () => {
  const step = createStepMock();
  const ctx = createApprovalContext();
  const jobs = [jobOf('a', 60), jobOf('b', 65), jobOf('c', 74)];

  await processApprovalGates(ctx, step, newWorkflow(), jobs, false, 90);

  const sleeps = step.calls.filter((call) => call.api === 'sleep');
  const resolves = step.calls.filter((call) => call.name === 'resolve-approvals');
  assert.deepEqual(sleeps, [{ api: 'sleep', name: 'wait-approvals' }]);
  assert.equal(resolves.length, 1);
  const names = step.calls.map((call) => call.name);
  assert.ok(names.indexOf('wait-approvals') < names.indexOf('resolve-approvals'));
  assert.equal(names.indexOf('wait-approvals'), names.length - 2);
  assert.equal(ctx.notifications.length, 3);
});

test('each pending job is notified once even when its steps are retried', async () => {
  const step = createStepMock();
  const ctx = createApprovalContext({ failCreateOnce: ['a'], failNotifyOnce: ['b'] });
  const jobs = [jobOf('a', 62), jobOf('b', 66)];

  await processApprovalGates(ctx, step, newWorkflow(), jobs, false, 90);

  assert.deepEqual(ctx.notifications.map((n) => n.jobId).sort(), ['a', 'b']);
  assert.equal(step.calls.filter((call) => call.name === 'wait-approvals').length, 1);
});

test('resolve-approvals maps approved, rejected and pending decisions', async () => {
  const step = createStepMock();
  const ctx = createApprovalContext({
    statuses: { 'approval-wf-1-a': 'approved', 'approval-wf-1-b': 'rejected' },
  });
  const workflow = newWorkflow();
  const jobs = [jobOf('a', 61), jobOf('b', 70), jobOf('c', 74), jobOf('d', 80)];

  const { approvedJobs, approvalResults } = await processApprovalGates(
    ctx,
    step,
    workflow,
    jobs,
    false,
    90
  );

  assert.deepEqual(
    approvalResults.map((result) => result.status),
    ['human-approved', 'rejected', 'pending', 'approved']
  );
  assert.deepEqual(approvalResults[0].approvalMetadata.humanApproval, {
    status: 'approved',
    destination: 'wanted',
  });
  assert.equal(approvalResults[1].approvalMetadata.humanApproval, undefined);
  assert.deepEqual(
    approvedJobs.map((job) => job.id),
    ['a', 'd']
  );
  assert.equal(workflow.stats.jobsApproved, 2);
  assert.equal(workflow.stats.jobsRejected, 1);
  assert.equal(workflow.steps[0].step, 'approval-gate');
});

test('no sleep or resolve step when nothing is pending', async () => {
  const step = createStepMock();
  const ctx = createApprovalContext();
  const jobs = [jobOf('a', 80), jobOf('b', 30), jobOf('c', 95)];

  await processApprovalGates(ctx, step, newWorkflow(), jobs, true, 90);

  assert.equal(
    step.calls.some((call) => call.api === 'sleep' || call.name === 'resolve-approvals'),
    false
  );
  assert.equal(ctx.notifications.length, 0);
});

test('searchWorkflowJobs pauses between platforms outside the search steps', async () => {
  const step = createStepMock();
  const workflow = { id: 'wf-1', stats: {}, steps: [], errors: [] };
  const ctx = {
    async searchJobs(platform) {
      if (platform === 'broken') throw new Error('boom');
      return [{ id: `${platform}-1` }];
    },
    async logWorkflowStep() {},
  };

  const jobs = await searchWorkflowJobs(ctx, step, workflow, ['wanted', 'broken', 'jobkorea']);

  assert.deepEqual(jobs, [
    { id: 'wanted-1', source: 'wanted' },
    { id: 'jobkorea-1', source: 'jobkorea' },
  ]);
  assert.deepEqual(workflow.errors, [{ platform: 'broken', error: 'boom' }]);
  assert.equal(step.calls.filter((call) => call.api === 'sleep').length, 2);
  assert.equal(workflow.stats.jobsFound, 2);
});

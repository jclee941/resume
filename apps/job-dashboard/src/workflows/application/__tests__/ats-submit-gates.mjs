import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { attachWorkflowApproval, submitApprovedApplications } from '../application-submissions.js';

const blockedCounts = {
  fabricated: await blockedCallsFor(fabricatedAtsJob(), 'rejected', false, { submitOptIn: true }),
  rejected: await blockedCallsFor(trustedAtsJob({ canSubmit: false }), 'rejected', false, {
    submitOptIn: true,
  }),
  pending: await blockedCallsFor(
    trustedAtsJob({ approvalStatus: 'pending', humanApproval: false }),
    'pending',
    false,
    { submitOptIn: true }
  ),
  autoApproved: await blockedCallsFor(
    trustedAtsJob({ approvalStatus: 'auto-approved', humanApproval: false }),
    'human-approval-required',
    false,
    { explicitSubmit: true }
  ),
  highScore: await blockedCallsFor(
    trustedAtsJob({ approvalStatus: 'approved', humanApproval: false }),
    'human-approval-required',
    false,
    { explicitSubmit: true }
  ),
  wrongDestination: await blockedCallsFor(
    trustedAtsJob({ destination: 'lever' }),
    'human-approval-required',
    false,
    { explicitSubmit: true }
  ),
  dryRun: await blockedCallsFor(trustedAtsJob(), 'dry-run', true),
  missingOptIn: await blockedCallsFor(trustedAtsJob(), 'missing-opt-in'),
};

await assertAllowedAtsSubmit();
await assertWantedBehavior();
assertRunnerPassesWorkflowOptIn();

console.log(
  `T16-PASS fabricated=${blockedCounts.fabricated} rejected=${blockedCounts.rejected} ` +
    `pending=${blockedCounts.pending} autoApproved=${blockedCounts.autoApproved} ` +
    `highScore=${blockedCounts.highScore} wrongDestination=${blockedCounts.wrongDestination} ` +
    `dryRun=${blockedCounts.dryRun} ` +
    `missingOptIn=${blockedCounts.missingOptIn}`
);

async function blockedCallsFor(job, expectedStatus, dryRun = false, submitOptions = {}) {
  const calls = createCalls();
  const result = await submitApprovedApplications(
    createCtx(calls),
    createStep(calls),
    createWorkflow(),
    [job],
    'resume-master',
    dryRun,
    submitOptions
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].status, expectedStatus);
  assert.equal(result[0].success, expectedStatus === 'dry-run');
  assert.equal(result[0].networkWrite, false);
  return calls.generate + calls.resume + calls.submit + calls.record + calls.sleep;
}

async function assertAllowedAtsSubmit() {
  const calls = createCalls();
  const workflow = createWorkflow();
  const result = await submitApprovedApplications(
    createCtx(calls),
    createStep(calls),
    workflow,
    [trustedAtsJob()],
    'resume-master',
    false,
    { submitOptIn: true }
  );

  assert.deepEqual(result, [
    {
      success: true,
      jobId: 'greenhouse-real-1',
      company: 'Greenhouse Real',
      position: 'Security Engineer',
    },
  ]);
  assert.equal(calls.generate, 1);
  assert.equal(calls.resume, 1);
  assert.equal(calls.submit, 1);
  assert.equal(calls.record, 1);
  assert.equal(calls.sleep, 0);
  assert.equal(workflow.stats.jobsApplied, 1);
  assert.equal(workflow.stats.jobsFailed, 0);
}

async function assertWantedBehavior() {
  const calls = createCalls();
  const result = await submitApprovedApplications(
    createCtx(calls),
    createStep(calls),
    createWorkflow(),
    [
      { id: 'wanted-1', source: 'wanted', company: 'Wanted A', position: 'Backend' },
      { id: 'wanted-2', source: 'wanted', company: 'Wanted B', position: 'Platform' },
    ],
    'resume-master',
    false
  );

  assert.equal(result.length, 2);
  assert.equal(calls.generate, 2);
  assert.equal(calls.resume, 2);
  assert.equal(calls.submit, 2);
  assert.equal(calls.record, 2);
  assert.equal(calls.sleep, 1);
}

function fabricatedAtsJob() {
  return {
    id: 'greenhouse-real-1',
    source: 'greenhouse',
    company: 'Greenhouse Real',
    position: 'Security Engineer',
    matchScore: 98,
    adapterCapability: { canSubmit: true },
    approval: { id: 'approval-greenhouse-real-1', status: 'approved' },
    workflowApprovalRequestId: 'approval-greenhouse-real-1',
    workflowApprovalStatus: 'approved',
    workflowApprovalMetadata: { adapterCapability: { canSubmit: true } },
  };
}

function trustedAtsJob({
  canSubmit = true,
  approvalStatus = 'human-approved',
  humanApproval = true,
  destination = 'greenhouse',
} = {}) {
  const metadata = { adapterCapability: { canSubmit } };
  if (humanApproval) metadata.humanApproval = { status: 'approved', destination };
  return attachWorkflowApproval(fabricatedAtsJob(), {
    id: 'approval-greenhouse-real-1',
    status: approvalStatus,
    metadata,
  });
}

function assertRunnerPassesWorkflowOptIn() {
  const source = readFileSync(new URL('../workflow-runner.js', import.meta.url), 'utf8');
  assert.match(source, /dryRun = true/);
  assert.match(source, /submitApprovedApplications\([\s\S]*\{ explicitSubmit, submitOptIn \}/);
}

function createCalls() {
  return { generate: 0, resume: 0, submit: 0, record: 0, sleep: 0 };
}

function createWorkflow() {
  return {
    id: 'workflow-t16',
    stats: { jobsApplied: 0, jobsFailed: 0 },
    steps: [],
  };
}

function createCtx(calls) {
  return {
    async generateCoverLetter() {
      calls.generate += 1;
      return 'cover letter';
    },
    async getResume(resumeId) {
      calls.resume += 1;
      return { id: resumeId };
    },
    async submitApplication() {
      calls.submit += 1;
      return { success: true };
    },
    async recordApplication() {
      calls.record += 1;
    },
    async logWorkflowStep() {},
  };
}

function createStep(calls) {
  return {
    async do(_name, _options, callback) {
      return callback();
    },
    async sleep() {
      calls.sleep += 1;
    },
  };
}

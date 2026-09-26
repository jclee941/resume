import assert from 'node:assert/strict';

import { attachServerAtsCapability, processApprovalGates } from '../approval-gates.js';
import { submitApprovedApplications } from '../application-submissions.js';

const calls = { approval: 0, generate: 0, resume: 0, submit: 0, record: 0, sleep: 0 };
const workflow = {
  id: 'workflow-t16-handoff',
  stats: { jobsApproved: 0, jobsRejected: 0, jobsApplied: 0, jobsFailed: 0 },
  steps: [],
};

const autoJob = attachServerAtsCapability(
  {
    id: 'greenhouse-auto-1',
    source: 'greenhouse',
    company: 'Greenhouse Auto',
    position: 'Security Engineer',
    matchScore: 96,
  },
  { canSubmit: true, mode: 'supported-submit' }
);

const humanJob = attachServerAtsCapability(
  {
    id: 'greenhouse-human-1',
    source: 'greenhouse',
    company: 'Greenhouse Human',
    position: 'Security Engineer',
    matchScore: 70,
  },
  { canSubmit: true, mode: 'supported-submit' }
);

const autoApproval = await processApprovalGates(
  createApprovalCtx('auto-approved'),
  createStep(),
  workflow,
  [autoJob],
  true,
  90
);
const blocked = await submitApprovedApplications(
  createSubmitCtx(),
  createStep(),
  workflow,
  autoApproval.approvedJobs,
  'resume-master',
  false,
  { explicitSubmit: true }
);

assert.equal(blocked[0].success, false);
assert.equal(blocked[0].status, 'human-approval-required');
assert.equal(calls.submit, 0);

const humanApproval = await processApprovalGates(
  createApprovalCtx('pending'),
  createStep(),
  workflow,
  [humanJob],
  false,
  90
);
const result = await submitApprovedApplications(
  createSubmitCtx(),
  createStep(),
  workflow,
  humanApproval.approvedJobs,
  'resume-master',
  false,
  { explicitSubmit: true }
);

assert.equal(result[0].success, true);
assert.equal(result[0].jobId, 'greenhouse-human-1');
assert.equal(calls.approval, 2);
assert.equal(calls.submit, 1);
assert.equal(workflow.stats.jobsApproved, 2);
assert.equal(workflow.stats.jobsApplied, 1);
assert.equal(humanApproval.approvalResults[0].status, 'human-approved');
assert.equal(
  humanApproval.approvalResults[0].approvalMetadata.humanApproval.destination,
  'greenhouse'
);

console.log('T16-HANDOFF-PASS autoBlocked=1 humanSubmit=1');

function createApprovalCtx(expectedStatus) {
  return {
    env: { JOB_DB: createEmptyApplicationsDb() },
    async createApprovalRequest(_workflowId, _job, status, _matchScore, metadata) {
      calls.approval += 1;
      assert.equal(status, expectedStatus);
      assert.equal(metadata.adapterCapability.canSubmit, true);
      return `approval-${_job.id}`;
    },
    async sendApprovalRequestNotification() {},
    async getApprovalStatus() {
      return 'approved';
    },
    async logWorkflowStep() {},
  };
}

function createSubmitCtx() {
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

function createEmptyApplicationsDb() {
  return {
    prepare() {
      return {
        bind() {
          return { first: async () => null };
        },
      };
    },
  };
}

function createStep() {
  return {
    async do(_name, _options, callback) {
      return callback();
    },
    async sleep() {
      calls.sleep += 1;
    },
  };
}

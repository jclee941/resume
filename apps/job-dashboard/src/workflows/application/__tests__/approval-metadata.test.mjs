import assert from 'node:assert/strict';

import { WORKFLOW_APPROVAL } from '../application-submissions.js';
import { processApprovalGates } from '../approval-gates.js';

const recorded = {
  approvals: [],
  logs: [],
};

const workflow = {
  id: 'workflow-t12',
  stats: { jobsApproved: 0, jobsRejected: 0 },
  steps: [],
};

const job = {
  id: 'greenhouse-job-42',
  source: 'greenhouse',
  position: 'Security Engineer',
  company: 'Greenhouse ATS Fixture',
  matchScore: 76,
  atsStub: true,
};

const ctx = {
  env: {
    JOB_DB: {
      prepare(query) {
        assert.match(query, /SELECT id FROM applications/);
        return { bind: () => ({ first: async () => null }) };
      },
    },
  },
  async createApprovalRequest(workflowId, approvalJob, status, matchScore, approvalMetadata) {
    recorded.approvals.push({ workflowId, approvalJob, status, matchScore, approvalMetadata });
    return `approval-${approvalJob.id}`;
  },
  async sendApprovalRequestNotification() {},
  async getApprovalStatus() {
    return 'pending';
  },
  async logWorkflowStep(workflowId, stepName, status, details) {
    recorded.logs.push({ workflowId, stepName, status, details });
  },
};

const step = {
  async do(_name, _options, callback) {
    return callback();
  },
  async sleep() {},
};

const result = await processApprovalGates(ctx, step, workflow, [job], false, 75);
const [approval] = recorded.approvals;
const [log] = recorded.logs;
const [approvalStep] = workflow.steps;
const [approvedJob] = result.approvedJobs;

assert.equal(result.approvalResults[0].status, 'approved');
assert.deepEqual(approval.approvalMetadata, {
  score: 76,
  source: 'greenhouse',
  adapterCapability: {
    platform: 'greenhouse',
    mode: 'dry-run',
    canSubmit: false,
  },
  packetPath:
    'packages/data/resumes/applications/foreign-company/foreign_company_security_sre_packet.json',
});
assert.deepEqual(result.approvalResults[0].approvalMetadata, approval.approvalMetadata);
assert.equal(approvedJob.workflowApprovalRequestId, 'approval-greenhouse-job-42');
assert.equal(approvedJob.workflowApprovalStatus, 'approved');
assert.deepEqual(approvedJob.workflowApprovalMetadata, approval.approvalMetadata);
assert.deepEqual(approvedJob[WORKFLOW_APPROVAL], {
  id: 'approval-greenhouse-job-42',
  status: 'approved',
  metadata: approval.approvalMetadata,
});
assert.deepEqual(approvalStep.approvalMetadata, [approval.approvalMetadata]);
assert.deepEqual(log.details.approvalMetadata, [approval.approvalMetadata]);

console.log(
  JSON.stringify({
    result: 'T12-PASS',
    channel: 'local-workflow-fixture',
    reason: 'dev stub only serves /api/auto-apply/run, not /job/api/workflows/application',
    approvalRequestId: approvedJob.workflowApprovalRequestId,
    adapterCapability: approval.approvalMetadata.adapterCapability,
    packetPath: approval.approvalMetadata.packetPath,
  })
);

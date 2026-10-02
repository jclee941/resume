import {
  isCompanyAlreadyApplied,
  normalizeCompany,
} from '../../handlers/auto-apply/duplicate-company.js';
import { attachWorkflowApproval } from './application-submissions.js';
import { buildApprovalMetadata, withHumanApproval } from './approval-metadata.js';

export { attachServerAtsCapability } from './approval-metadata.js';

/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       first(): Promise<{ id?: unknown; status?: unknown } | null>;
 *       run(): Promise<unknown>;
 *     };
 *   };
 * }} ApprovalDb
 *
 * @typedef {import('./approval-metadata.js').ApprovalMetadata} ApprovalMetadata
 *
 * @typedef {import('./approval-metadata.js').ScoredJob} ScoredJob
 *
 * @typedef {{
 *   status: string;
 *   job: ScoredJob;
 *   approvalMetadata: ApprovalMetadata;
 *   requestId?: string;
 *   reason?: string;
 * }} ApprovalResult
 *
 * @typedef {{
 *   env: { JOB_DB: ApprovalDb; [key: string]: unknown };
 *   createApprovalRequest(workflowId: string, job: ScoredJob, status: string, matchScore: number, metadata: ApprovalMetadata): Promise<string>;
 *   sendApprovalRequestNotification(workflowId: string, requestId: string, job: ScoredJob): Promise<void>;
 *   getApprovalStatus(requestId: string): Promise<string>;
 *   logWorkflowStep(workflowId: string, stepName: string, status: string, details: Record<string, unknown>): Promise<unknown>;
 * }} ApprovalContext
 *
 * @typedef {import('cloudflare:workers').WorkflowStep} ApprovalStep
 *
 * @typedef {{
 *   id: string;
 *   stats: {
 *     jobsApproved: number;
 *     jobsRejected: number;
 *     jobsAlreadyRequested?: number;
 *     [key: string]: unknown;
 *   };
 *   steps: unknown[];
 *   [key: string]: unknown;
 * }} ApprovalWorkflow
 */

/**
 * @param {ApprovalContext} ctx
 * @param {ApprovalStep} step
 * @param {ApprovalWorkflow} workflow
 * @param {ScoredJob[]} scoredJobs
 * @param {boolean} autoApprove
 * @param {number} autoApproveThreshold
 * @param {number} [limit] the most jobs to approve or ask about (the daily applications left);
 *   jobs already applied to are skipped without counting, so they never use it up
 * @returns {Promise<{ approvedJobs: Array<import('./workflow-notifications.js').ApprovedJob>; approvalResults: ApprovalResult[] }>}
 */
export async function processApprovalGates(
  ctx,
  step,
  workflow,
  scoredJobs,
  autoApprove,
  autoApproveThreshold,
  limit = Number.POSITIVE_INFINITY
) {
  const approvedJobs = [];
  const evaluatedResults = [];
  const approvedCompanies = new Set();
  let granted = 0;

  for (const job of scoredJobs) {
    if (granted >= limit) break;
    const approvalMetadata = buildApprovalMetadata(job);
    const company = normalizeCompany(job.company).toLowerCase();
    if (company && approvedCompanies.has(company)) {
      evaluatedResults.push({
        status: 'already-applied',
        job,
        reason: 'Company approved earlier in this run',
        approvalMetadata,
      });
      continue;
    }
    const approvalResult = await step.do(
      `approval-gate-${job.id}`,
      { retries: { limit: 2, delay: '5 seconds' }, timeout: '2 minutes' },
      async () =>
        evaluateApproval(ctx, workflow, job, autoApprove, autoApproveThreshold, approvalMetadata)
    );

    const { requestId } = approvalResult;
    if (approvalResult.status === 'pending' && requestId) {
      // Separate step so a retried gate never re-sends the notification.
      await step.do(
        `approval-notify-${job.id}`,
        { retries: { limit: 2, delay: '5 seconds' }, timeout: '1 minute' },
        async () => ctx.sendApprovalRequestNotification(workflow.id, requestId, job)
      );
    }

    if (company && isApprovedResult(approvalResult.status)) approvedCompanies.add(company);
    if (isApprovedResult(approvalResult.status) || approvalResult.status === 'pending') granted++;
    evaluatedResults.push(approvalResult);
  }

  const approvalResults = await resolvePendingApprovals(ctx, step, evaluatedResults);

  for (const approvalResult of approvalResults) {
    if (isApprovedResult(approvalResult.status)) {
      approvedJobs.push(createApprovedJob(approvalResult));
      workflow.stats.jobsApproved++;
    } else if (approvalResult.status === 'rejected') {
      workflow.stats.jobsRejected++;
    } else if (approvalResult.status === 'already-requested') {
      workflow.stats.jobsAlreadyRequested = (workflow.stats.jobsAlreadyRequested ?? 0) + 1;
    }
  }

  workflow.steps.push({
    step: 'approval-gate',
    status: 'completed',
    approved: workflow.stats.jobsApproved,
    rejected: workflow.stats.jobsRejected,
    alreadyRequested: workflow.stats.jobsAlreadyRequested ?? 0,
    approvalMetadata: approvalResults.map((result) => result.approvalMetadata),
  });
  await ctx.logWorkflowStep(workflow.id, 'approval-gate', 'completed', {
    approved: workflow.stats.jobsApproved,
    rejected: workflow.stats.jobsRejected,
    alreadyRequested: workflow.stats.jobsAlreadyRequested ?? 0,
    approvalMetadata: approvalResults.map((result) => result.approvalMetadata),
  });

  return { approvedJobs, approvalResults };
}

/**
 * Waits once for every pending approval, then reads their decisions in one step.
 * @param {ApprovalContext} ctx
 * @param {ApprovalStep} step
 * @param {ApprovalResult[]} results
 * @returns {Promise<ApprovalResult[]>}
 */
async function resolvePendingApprovals(ctx, step, results) {
  const pending = results.filter((result) => result.status === 'pending');
  if (pending.length === 0) return results;

  await step.sleep('wait-approvals', '24 hours');
  const decisions = await step.do(
    'resolve-approvals',
    { retries: { limit: 2, delay: '5 seconds' }, timeout: '2 minutes' },
    async () => {
      /** @type {Array<{ status: string; approvalMetadata: ApprovalMetadata }>} */
      const resolved = [];
      for (const result of pending) {
        const requestId = /** @type {string} */ (result.requestId);
        const status = await ctx.getApprovalStatus(requestId);
        resolved.push({
          status: status === 'approved' ? 'human-approved' : status,
          approvalMetadata:
            status === 'approved'
              ? withHumanApproval(result.approvalMetadata, result.job)
              : result.approvalMetadata,
        });
      }
      return resolved;
    }
  );

  return results.map((result) =>
    result.status === 'pending' ? { ...result, ...decisions.shift() } : result
  );
}

/**
 * @param {ApprovalContext} ctx
 * @param {ApprovalWorkflow} workflow
 * @param {ScoredJob} job
 * @param {boolean} autoApprove
 * @param {number} autoApproveThreshold
 * @param {ApprovalMetadata} approvalMetadata
 * @returns {Promise<ApprovalResult>}
 */
async function evaluateApproval(
  ctx,
  workflow,
  job,
  autoApprove,
  autoApproveThreshold,
  approvalMetadata
) {
  const db = ctx.env.JOB_DB;
  const existing = await db
    .prepare('SELECT id FROM applications WHERE job_id = ? AND source = ?')
    .bind(job.id, job.source)
    .first();

  if (existing) {
    return { status: 'already-applied', job, approvalMetadata };
  }

  if (await isCompanyAlreadyApplied(ctx.env, job.company)) {
    return { status: 'already-applied', job, reason: 'Company already applied', approvalMetadata };
  }

  // An earlier request for this job (any workflow) means the owner was already asked. A
  // rejection always sticks; an undecided or approved-but-unsent one only stops runs that need
  // a human, because auto-approval decides for the owner. The gate's own id is excluded so a
  // retried step that already inserted its request is not mistaken for an earlier one.
  const ownRequestId = `approval-${workflow.id}-${job.id}`;
  const autoApproves = autoApprove && job.matchScore >= autoApproveThreshold;
  const earlier = await db
    .prepare(
      "SELECT id, status FROM approval_requests WHERE job_id = ? AND id != ? ORDER BY status = 'rejected' DESC LIMIT 1"
    )
    .bind(job.id, ownRequestId)
    .first();

  if (earlier && (earlier.status === 'rejected' || !autoApproves)) {
    return {
      status: 'already-requested',
      job,
      requestId: String(earlier.id),
      approvalMetadata,
    };
  }

  if (autoApproves) {
    const requestId = await ctx.createApprovalRequest(
      workflow.id,
      job,
      'auto-approved',
      job.matchScore,
      approvalMetadata
    );
    if (earlier) await supersedePendingRequests(db, job.id, requestId);
    return { status: 'auto-approved', job, requestId, approvalMetadata };
  }

  if (job.matchScore >= 75) {
    const requestId = await ctx.createApprovalRequest(
      workflow.id,
      job,
      'approved',
      job.matchScore,
      approvalMetadata
    );
    return { status: 'approved', job, requestId, approvalMetadata };
  }

  if (job.matchScore >= 60) {
    const requestId = await ctx.createApprovalRequest(
      workflow.id,
      job,
      'pending',
      job.matchScore,
      approvalMetadata
    );
    return { status: 'pending', job, requestId, approvalMetadata };
  }

  await ctx.createApprovalRequest(workflow.id, job, 'rejected', job.matchScore, approvalMetadata);
  return { status: 'rejected', job, reason: 'Match score below threshold', approvalMetadata };
}

/**
 * Closes requests an earlier run left waiting on the owner once auto-approval decided the job.
 * @param {ApprovalDb} db
 * @param {unknown} jobId
 * @param {string} requestId
 * @returns {Promise<void>}
 */
async function supersedePendingRequests(db, jobId, requestId) {
  await db
    .prepare(
      `UPDATE approval_requests
       SET status = 'superseded', reviewed_by = 'auto-apply', reviewed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE job_id = ? AND status = 'pending' AND id != ?`
    )
    .bind(jobId, requestId)
    .run();
}

/**
 * @param {string} status
 * @returns {boolean}
 */
function isApprovedResult(status) {
  return status === 'approved' || status === 'auto-approved' || status === 'human-approved';
}

/**
 * @param {ApprovalResult} result
 * @returns {import('./workflow-notifications.js').ApprovedJob}
 */
function createApprovedJob(result) {
  return /** @type {import('./workflow-notifications.js').ApprovedJob} */ (
    attachWorkflowApproval(result.job, {
      id: result.requestId,
      status: result.status,
      metadata:
        /** @type {import('./application-submission-gates.js').WorkflowApproval['metadata']} */ (
          result.approvalMetadata
        ),
    })
  );
}

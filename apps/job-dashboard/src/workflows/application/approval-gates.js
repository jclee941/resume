import { attachWorkflowApproval } from './application-submissions.js';

const FOREIGN_ATS_PLATFORMS = new Set(['greenhouse', 'lever', 'ashby']);
const SERVER_ATS_CAPABILITY = Symbol('serverAtsCapability');
const FOREIGN_COMPANY_PACKET_PATH =
  'packages/data/resumes/applications/foreign-company/foreign_company_security_sre_packet.json';

/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       first(): Promise<{ id?: unknown } | null>;
 *     };
 *   };
 * }} ApprovalDb
 *
 * @typedef {{
 *   platform: string;
 *   mode: string;
 *   canSubmit: boolean;
 *   dryRunFirst?: boolean;
 * }} ServerAtsCapability
 *
 * @typedef {{
 *   score: number | null;
 *   source: string;
 *   adapterCapability: ServerAtsCapability | null;
 *   packetPath: string | null;
 *   humanApproval?: {
 *     status: string;
 *     destination: string;
 *   };
 * }} ApprovalMetadata
 *
 * @typedef {{
 *   id: string | number;
 *   source: string;
 *   matchScore: number;
 *   platform?: string;
 *   dryRun?: boolean;
 *   atsStub?: boolean;
 *   packetPath?: string;
 *   applicationPacketPath?: string;
 *   packet?: { source?: { path?: string } };
 *   [key: string]: unknown;
 *   [key: symbol]: unknown;
 * }} ScoredJob
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
 *   logWorkflowStep(workflowId: string, stepName: string, status: string, details: Record<string, unknown>): Promise<void>;
 *   [key: string]: unknown;
 * }} ApprovalContext
 *
 * @typedef {{
 *   do<T>(name: string, optionsOrFn: unknown, fn?: () => Promise<T>): Promise<T>;
 *   sleep(name: string, duration: string): Promise<void>;
 * }} ApprovalStep
 *
 * @typedef {{
 *   id: string;
 *   stats: { jobsApproved: number; jobsRejected: number; [key: string]: unknown };
 *   steps: Array<Record<string, unknown>>;
 *   [key: string]: unknown;
 * }} ApprovalWorkflow
 */

/**
 * @param {Record<string, unknown>} job
 * @param {unknown} capability
 * @returns {Record<string, unknown>}
 */
export function attachServerAtsCapability(job, capability) {
  return { ...job, [SERVER_ATS_CAPABILITY]: capability };
}

/**
 * @param {ApprovalContext} ctx
 * @param {ApprovalStep} step
 * @param {ApprovalWorkflow} workflow
 * @param {ScoredJob[]} scoredJobs
 * @param {boolean} autoApprove
 * @param {number} autoApproveThreshold
 * @returns {Promise<{ approvedJobs: Array<Record<string, unknown>>; approvalResults: ApprovalResult[] }>}
 */
export async function processApprovalGates(
  ctx,
  step,
  workflow,
  scoredJobs,
  autoApprove,
  autoApproveThreshold
) {
  const approvedJobs = [];
  const approvalResults = [];

  for (const job of scoredJobs) {
    const approvalMetadata = buildApprovalMetadata(job);
    const approvalResult = await step.do(
      `approval-gate-${job.id}`,
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () =>
        evaluateApproval(
          ctx,
          step,
          workflow,
          job,
          autoApprove,
          autoApproveThreshold,
          approvalMetadata
        )
    );

    approvalResults.push(approvalResult);

    if (isApprovedResult(approvalResult.status)) {
      approvedJobs.push(createApprovedJob(approvalResult));
      workflow.stats.jobsApproved++;
    } else if (approvalResult.status === 'rejected') {
      workflow.stats.jobsRejected++;
    }
  }

  workflow.steps.push({
    step: 'approval-gate',
    status: 'completed',
    approved: workflow.stats.jobsApproved,
    rejected: workflow.stats.jobsRejected,
    approvalMetadata: approvalResults.map((result) => result.approvalMetadata),
  });
  await ctx.logWorkflowStep(workflow.id, 'approval-gate', 'completed', {
    approved: workflow.stats.jobsApproved,
    rejected: workflow.stats.jobsRejected,
    approvalMetadata: approvalResults.map((result) => result.approvalMetadata),
  });

  return { approvedJobs, approvalResults };
}

/**
 * @param {ApprovalContext} ctx
 * @param {ApprovalStep} step
 * @param {ApprovalWorkflow} workflow
 * @param {ScoredJob} job
 * @param {boolean} autoApprove
 * @param {number} autoApproveThreshold
 * @param {ApprovalMetadata} approvalMetadata
 * @returns {Promise<ApprovalResult>}
 */
async function evaluateApproval(
  ctx,
  step,
  workflow,
  job,
  autoApprove,
  autoApproveThreshold,
  approvalMetadata
) {
  const existing = await ctx.env.JOB_DB.prepare(
    'SELECT id FROM applications WHERE job_id = ? AND source = ?'
  )
    .bind(job.id, job.source)
    .first();

  if (existing) {
    return { status: 'already-applied', job, approvalMetadata };
  }

  if (autoApprove && job.matchScore >= autoApproveThreshold) {
    const requestId = await ctx.createApprovalRequest(
      workflow.id,
      job,
      'auto-approved',
      job.matchScore,
      approvalMetadata
    );
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
    await ctx.sendApprovalRequestNotification(workflow.id, requestId, job);
    await step.sleep(`wait-approval-${job.id}`, '24 hours');
    const approvalStatus = await ctx.getApprovalStatus(requestId);
    const metadata =
      approvalStatus === 'approved' ? withHumanApproval(approvalMetadata, job) : approvalMetadata;
    return {
      status: approvalStatus === 'approved' ? 'human-approved' : approvalStatus,
      job,
      requestId,
      approvalMetadata: metadata,
    };
  }

  await ctx.createApprovalRequest(workflow.id, job, 'rejected', job.matchScore, approvalMetadata);
  return { status: 'rejected', job, reason: 'Match score below threshold', approvalMetadata };
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
 * @returns {Record<string, unknown>}
 */
function createApprovedJob(result) {
  return attachWorkflowApproval(result.job, {
    id: result.requestId,
    status: result.status,
    metadata: result.approvalMetadata,
  });
}

/**
 * @param {ApprovalMetadata} metadata
 * @param {ScoredJob} job
 * @returns {ApprovalMetadata}
 */
function withHumanApproval(metadata, job) {
  return {
    ...metadata,
    humanApproval: {
      status: 'approved',
      destination: toOptionalString(job?.source ?? job?.platform) ?? 'unknown',
    },
  };
}

/**
 * @param {ScoredJob} job
 * @returns {ApprovalMetadata}
 */
function buildApprovalMetadata(job) {
  const source = toOptionalString(job?.source ?? job?.platform) ?? 'unknown';
  return {
    score: toFiniteNumber(job?.matchScore),
    source,
    adapterCapability: createServerAdapterCapability(job, source),
    packetPath: normalizePacketPath(job, source),
  };
}

/**
 * @param {ScoredJob} job
 * @param {string} source
 * @returns {ServerAtsCapability | null}
 */
function createServerAdapterCapability(job, source) {
  if (!FOREIGN_ATS_PLATFORMS.has(source)) return null;
  const capability = /** @type {Record<string, unknown> | null | undefined} */ (
    job?.[SERVER_ATS_CAPABILITY]
  );
  if (capability && typeof capability === 'object' && !Array.isArray(capability)) {
    return {
      platform: source,
      mode: toOptionalString(capability.mode) ?? 'manual-review',
      canSubmit: capability.canSubmit === true,
      dryRunFirst: capability.dryRunFirst !== false,
    };
  }
  return {
    platform: source,
    mode: job?.dryRun === true || job?.atsStub === true ? 'dry-run' : 'manual-review',
    canSubmit: false,
  };
}

/**
 * @param {ScoredJob} job
 * @param {string} source
 * @returns {string | null}
 */
function normalizePacketPath(job, source) {
  const packetPath = toOptionalString(
    job?.packetPath ?? job?.applicationPacketPath ?? job?.packet?.source?.path
  );
  if (packetPath) return packetPath;
  return FOREIGN_ATS_PLATFORMS.has(source) ? FOREIGN_COMPANY_PACKET_PATH : null;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function toOptionalString(value) {
  return typeof value === 'string' && value.trim() ? value : null;
}

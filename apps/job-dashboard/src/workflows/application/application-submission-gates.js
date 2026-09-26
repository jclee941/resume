import { isAtsDryRunPlatform } from './platforms.js';

export const WORKFLOW_APPROVAL = Symbol('workflowApproval');

/**
 * @typedef {{
 *   canSubmit?: boolean;
 *   supportsSubmit?: boolean;
 *   submitSupported?: boolean;
 * }} AtsAdapterCapability
 */

/**
 * @typedef {{
 *   id?: string;
 *   status?: string;
 *   metadata?: {
 *     adapterCapability?: AtsAdapterCapability;
 *     humanApproval?: {
 *       status?: string;
 *       destination?: string;
 *     };
 *     [key: string]: unknown;
 *   };
 *   [key: string]: unknown;
 * }} WorkflowApproval
 */

/**
 * @typedef {Record<string, unknown> & {
 *   id?: string | number;
 *   sourceId?: string | number;
 *   source?: string;
 *   company?: string;
 *   position?: string;
 *   title?: string;
 *   workflowApprovalRequestId?: string;
 *   workflowApprovalStatus?: string;
 *   workflowApprovalMetadata?: Record<string, unknown>;
 *   [key: symbol]: unknown;
 * }} GateJob
 */

/**
 * @typedef {{
 *   canSubmit: boolean;
 *   status?: string;
 *   reason?: string;
 * }} AtsGateEvaluation
 */

/**
 * @typedef {{
 *   success: boolean;
 *   dryRun?: boolean;
 *   networkWrite: boolean;
 *   action: string;
 *   status?: string;
 *   reason?: string;
 *   platform?: string;
 *   jobId?: string;
 *   company?: string;
 *   position?: string;
 *   resumeId?: string;
 * }} AtsGateResult
 */

/**
 * @param {Record<string, unknown>} job
 * @param {WorkflowApproval} approval
 * @returns {Record<string, unknown>}
 */
export function attachWorkflowApproval(job, approval) {
  return {
    ...job,
    workflowApprovalRequestId: approval.id,
    workflowApprovalStatus: approval.status,
    workflowApprovalMetadata: approval.metadata,
    [WORKFLOW_APPROVAL]: approval,
  };
}

/**
 * @param {GateJob[]} jobs
 * @param {string} [resumeId]
 * @returns {AtsGateResult[]}
 */
export function createAtsSubmissionPreviews(jobs, resumeId) {
  return jobs.filter(isPreviewableAtsJob).map((job) => ({
    success: true,
    dryRun: true,
    networkWrite: false,
    action: 'would_apply',
    status: 'dry-run',
    platform: job.source,
    jobId: safePreviewText(job.id || job.sourceId),
    company: safePreviewText(job.company),
    position: safePreviewText(job.position || job.title),
    resumeId: safePreviewText(resumeId),
  }));
}

/**
 * @param {GateJob | null | undefined} job
 * @param {boolean} [submitOptIn]
 * @returns {AtsGateEvaluation}
 */
export function evaluateAtsSubmitGate(job, submitOptIn) {
  if (!isAtsDryRunPlatform(job?.source)) return { canSubmit: true };
  if (!hasSubmitCapability(job)) {
    return { canSubmit: false, status: 'rejected', reason: 'ATS adapter cannot submit' };
  }
  const approvalGate = evaluateHumanApprovalGate(job);
  if (!approvalGate.canSubmit) return approvalGate;
  if (!submitOptIn) {
    return {
      canSubmit: false,
      status: 'missing-opt-in',
      reason: 'Explicit ATS submit flag is required',
    };
  }
  return { canSubmit: true };
}

/**
 * @param {GateJob | null | undefined} job
 * @param {AtsGateEvaluation} gate
 * @returns {AtsGateResult}
 */
export function createAtsGateResult(job, gate) {
  return {
    success: false,
    networkWrite: false,
    action: 'blocked',
    status: gate.status,
    reason: gate.reason,
    platform: safePreviewText(job?.source),
    jobId: safePreviewText(job?.id || job?.sourceId),
    company: safePreviewText(job?.company),
    position: safePreviewText(job?.position || job?.title),
  };
}

/**
 * @param {GateJob[]} jobs
 * @param {number} index
 * @param {boolean} [submitOptIn]
 * @returns {boolean}
 */
export function hasLaterSubmitCandidate(jobs, index, submitOptIn) {
  return jobs.slice(index + 1).some((job) => evaluateAtsSubmitGate(job, submitOptIn).canSubmit);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function safePreviewText(value) {
  if (value == null) return '';
  return Array.from(String(value), safePreviewCharacter).join('').slice(0, 160);
}

/**
 * @param {GateJob} job
 * @returns {boolean}
 */
function isPreviewableAtsJob(job) {
  return Boolean(job?.id || job?.sourceId) && isAtsDryRunPlatform(job.source);
}

/**
 * @param {GateJob | null | undefined} job
 * @returns {boolean}
 */
function hasSubmitCapability(job) {
  const capability = getWorkflowApproval(job)?.metadata?.adapterCapability;
  return Boolean(
    capability?.canSubmit === true ||
    capability?.supportsSubmit === true ||
    capability?.submitSupported === true
  );
}

/**
 * @param {GateJob | null | undefined} job
 * @returns {AtsGateEvaluation}
 */
function evaluateHumanApprovalGate(job) {
  const approval = getWorkflowApproval(job);
  if (approval?.status === 'pending') {
    return { canSubmit: false, status: 'pending', reason: 'ATS approval is pending' };
  }
  if (approval?.status === 'rejected') {
    return { canSubmit: false, status: 'rejected', reason: 'ATS approval was rejected' };
  }
  if (hasExplicitHumanApproval(job)) return { canSubmit: true };
  return {
    canSubmit: false,
    status: 'human-approval-required',
    reason: 'Explicit human ATS approval is required for this destination',
  };
}

/**
 * @param {GateJob | null | undefined} job
 * @returns {boolean}
 */
function hasExplicitHumanApproval(job) {
  const approval = getWorkflowApproval(job);
  const marker = approval?.metadata?.humanApproval;
  return Boolean(
    approval?.id &&
    (approval.status === 'human-approved' || marker?.status === 'approved') &&
    marker?.destination === job?.source
  );
}

/**
 * @param {GateJob | null | undefined} job
 * @returns {WorkflowApproval | null}
 */
function getWorkflowApproval(job) {
  return /** @type {WorkflowApproval | null} */ (job?.[WORKFLOW_APPROVAL] || null);
}

/**
 * @param {string} character
 * @returns {string}
 */
function safePreviewCharacter(character) {
  const code = character.charCodeAt(0);
  return code < 32 || code === 127 ? ' ' : character;
}

import { isAtsDryRunPlatform } from './platforms.js';

export const WORKFLOW_APPROVAL = Symbol('workflowApproval');

export function attachWorkflowApproval(job, approval) {
  return {
    ...job,
    workflowApprovalRequestId: approval.id,
    workflowApprovalStatus: approval.status,
    workflowApprovalMetadata: approval.metadata,
    [WORKFLOW_APPROVAL]: approval,
  };
}

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

export function hasLaterSubmitCandidate(jobs, index, submitOptIn) {
  return jobs.slice(index + 1).some((job) => evaluateAtsSubmitGate(job, submitOptIn).canSubmit);
}

export function safePreviewText(value) {
  if (value == null) return '';
  return Array.from(String(value), safePreviewCharacter).join('').slice(0, 160);
}

function isPreviewableAtsJob(job) {
  return Boolean(job?.id || job?.sourceId) && isAtsDryRunPlatform(job.source);
}

function hasSubmitCapability(job) {
  const capability = getWorkflowApproval(job)?.metadata?.adapterCapability;
  return Boolean(
    capability?.canSubmit === true ||
      capability?.supportsSubmit === true ||
      capability?.submitSupported === true
  );
}

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

function hasExplicitHumanApproval(job) {
  const approval = getWorkflowApproval(job);
  const marker = approval?.metadata?.humanApproval;
  return Boolean(
    approval?.id &&
      (approval.status === 'human-approved' || marker?.status === 'approved') &&
      marker?.destination === job?.source
  );
}

function getWorkflowApproval(job) {
  return job?.[WORKFLOW_APPROVAL] || null;
}

function safePreviewCharacter(character) {
  const code = character.charCodeAt(0);
  return code < 32 || code === 127 ? ' ' : character;
}

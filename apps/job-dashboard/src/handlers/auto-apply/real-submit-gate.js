import { jsonResponse } from '../../middleware/cors.js';

const REAL_SUBMIT_ERROR = 'REAL_SUBMIT_APPROVAL_REQUIRED';

/**
 * @typedef {{
 *   approvalId?: unknown;
 *   approvalMetadata?: { approvalId?: unknown; [key: string]: unknown };
 *   workflowApprovalMetadata?: { approvalId?: unknown; [key: string]: unknown };
 *   [key: string]: unknown;
 * }} CandidateJob
 *
 * @typedef {import('./explicit-candidates.js').ValidExplicitCandidates} ExplicitCandidates
 *
 * @typedef {{
 *   explicitSubmit?: boolean;
 *   submitOptIn?: boolean;
 *   approvalId?: unknown;
 *   [key: string]: unknown;
 * }} SubmitBody
 */

/**
 * @param {SubmitBody} body
 * @param {boolean} dryRun
 * @param {ExplicitCandidates} explicitCandidates
 * @returns {Response | null}
 */
export function rejectInvalidRealSubmit(body, dryRun, explicitCandidates) {
  const gate = validateRealSubmitGate(body, dryRun, explicitCandidates);
  if (!gate.error) return null;
  return jsonResponse(
    {
      success: false,
      error: gate.error,
      errorCode: REAL_SUBMIT_ERROR,
    },
    400
  );
}

/**
 * @param {SubmitBody} body
 * @param {boolean} dryRun
 * @param {ExplicitCandidates} explicitCandidates
 * @returns {{ error?: string }}
 */
function validateRealSubmitGate(body, dryRun, explicitCandidates) {
  if (dryRun) return {};
  if (!explicitCandidates.hasExplicitCandidates) {
    return { error: 'Real submit requires explicit candidate approval' };
  }
  if (explicitCandidates.jobs.length !== 1) {
    return { error: 'Real submit requires exactly one explicit candidate' };
  }
  if (body.explicitSubmit !== true || body.submitOptIn !== true) {
    return { error: 'Real submit requires explicit submit opt-ins' };
  }

  const approvalId = normalizedText(body.approvalId);
  if (!approvalId) {
    return { error: 'Real submit requires approvalId' };
  }

  const [job] = explicitCandidates.jobs;
  if (candidateApprovalId(job) !== approvalId) {
    return { error: 'Real submit approvalId must match the explicit candidate' };
  }
  return {};
}

/**
 * @param {CandidateJob | null | undefined} job
 * @returns {string}
 */
function candidateApprovalId(job) {
  return (
    normalizedText(job?.approvalId) ||
    normalizedText(job?.approvalMetadata?.approvalId) ||
    normalizedText(job?.workflowApprovalMetadata?.approvalId)
  );
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizedText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

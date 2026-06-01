import { AppError, ErrorCodes, ValidationError } from '../../errors/index.js';

import { resolveApplicationId } from './approval-validation.js';
import { stringifyApprovalNotes } from './approval-notes.js';
import { upsertApprovalRequest } from './approval-store.js';

const HOUR_MS = 60 * 60 * 1000;

function toIso(value = Date.now()) {
  return new Date(value).toISOString();
}

export async function requestApproval(context, job, matchScore) {
  const score = Number(matchScore);
  if (!Number.isFinite(score) || score < 60 || score > 74) {
    throw new ValidationError('requestApproval requires score in range 60-74', {
      fields: ['matchScore'],
    });
  }

  const applicationId = resolveApplicationId(job);
  const application = await context.applicationRepository.findById(applicationId);
  if (!application) {
    throw new AppError('Application not found for approval request', ErrorCodes.NOT_FOUND, 404, {
      applicationId,
    });
  }

  const now = toIso();
  const workflowId =
    job?.workflow_id ||
    job?.workflowId ||
    application.workflow_id ||
    `manual-review-${now.slice(0, 10)}`;

  const notes = stringifyApprovalNotes({
    reason: null,
    reminderCount: 0,
    lastReminderAt: null,
    events: [{ type: 'requested', at: now }],
  });

  await upsertApprovalRequest(context.applicationRepository, {
    id: applicationId,
    workflowId,
    jobId: job?.id || job?.job_id || application.job_id || applicationId,
    jobTitle: job?.position || job?.title || application.position || 'Unknown Position',
    company: job?.company || job?.companyName || application.company || 'Unknown Company',
    platform: job?.source || job?.platform || application.source || 'unknown',
    matchScore: score,
    notes,
    now,
  });

  await context.applicationRepository.updateStatus(
    applicationId,
    'pending',
    `Manual approval required (match score ${score})`
  );

  const notification = await context.notificationAdapter.sendApprovalRequest(
    job,
    score,
    applicationId
  );

  return {
    applicationId,
    status: 'pending',
    workflowId,
    notification,
    requestedAt: now,
    expiresAt: toIso(Date.now() + context.config.approvalTimeoutHours * HOUR_MS),
  };
}

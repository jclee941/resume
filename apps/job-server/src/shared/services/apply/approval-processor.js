import { ValidationError } from '../../errors/index.js';

const HOUR_MS = 60 * 60 * 1000;

function toIso(value = Date.now()) {
  return new Date(value).toISOString();
}

export async function getPendingApprovals(applicationRepository) {
  return await applicationRepository.d1Client.query(
    `
      SELECT
        ar.*,
        a.status AS application_status,
        a.position,
        a.company AS application_company,
        a.source AS application_source
      FROM approval_requests ar
      LEFT JOIN applications a ON a.id = ar.id
      WHERE ar.status = 'pending'
      ORDER BY ar.created_at ASC
    `
  );
}

export async function checkApprovalStatus(context, applicationId) {
  if (!applicationId || typeof applicationId !== 'string') {
    throw new ValidationError('applicationId is required', {
      fields: ['applicationId'],
    });
  }

  const request = await context.getApprovalRequestById(applicationId);
  if (!request) {
    return {
      applicationId,
      status: 'not_requested',
      pending: false,
    };
  }

  const createdAtMs = Date.parse(request.created_at || toIso());
  const expiresAtMs = createdAtMs + context.config.approvalTimeoutHours * HOUR_MS;

  return {
    applicationId,
    status: request.status,
    pending: request.status === 'pending',
    reviewedBy: request.reviewed_by || null,
    reviewedAt: request.reviewed_at || null,
    createdAt: request.created_at,
    expiresAt: toIso(expiresAtMs),
    notes: context.parseApprovalNotes(request.notes),
  };
}

export async function processTimeouts(context) {
  const nowMs = Date.now();
  const now = toIso(nowMs);
  const pending = await getPendingApprovals(context.applicationRepository);

  const summary = {
    checked: pending.length,
    timedOut: 0,
    remindersSent: 0,
    reminderSkipped: 0,
  };

  for (const request of pending) {
    const createdAtMs = Date.parse(request.created_at || now);
    const ageMs = nowMs - createdAtMs;

    if (ageMs >= context.config.approvalTimeoutHours * HOUR_MS) {
      await context.markTimedOut(request, now);
      summary.timedOut += 1;
      continue;
    }

    const notesState = context.parseApprovalNotes(request.notes);
    if (!context.shouldSendReminder(notesState, nowMs)) {
      summary.reminderSkipped += 1;
      continue;
    }

    const notification = await context.notificationAdapter.sendApprovalRequest(
      {
        id: request.job_id,
        position: request.job_title,
        company: request.company,
        source: request.platform,
      },
      request.match_score,
      request.id
    );

    notesState.reminderCount += 1;
    notesState.lastReminderAt = now;
    notesState.events.push({ type: 'reminder_sent', at: now, sent: !!notification?.sent });

    await context.updateApprovalRequest(request.id, {
      notes: context.stringifyApprovalNotes(notesState),
      updated_at: now,
    });

    if (notification?.sent) {
      summary.remindersSent += 1;
    }
  }

  return summary;
}

import { ValidationError } from '../../errors/index.js';

/**
 * @typedef {import('./approval-notes.js').ApprovalNotesState} ApprovalNotesState
 *
 * @typedef {{
 *   id: string;
 *   job_id: string;
 *   job_title: string;
 *   company: string;
 *   platform: string;
 *   match_score: number;
 *   status: string;
 *   created_at: string;
 *   notes?: string | null;
 *   reviewed_by?: string | null;
 *   reviewed_at?: string | null;
 *   [key: string]: unknown;
 * }} PendingApprovalRecord
 *
 * @typedef {{
 *   applicationRepository: { d1Client: { query: (sql: string, ...params: unknown[]) => Promise<PendingApprovalRecord[]> } };
 *   config: { approvalTimeoutHours: number; reminderIntervalHours: number; maxReminders: number };
 *   notificationAdapter: { sendApprovalRequest: (job: unknown, matchScore: number, id: string) => Promise<{ sent?: boolean } | null | undefined> };
 *   getApprovalRequestById: (applicationId: string) => Promise<PendingApprovalRecord | null>;
 *   markTimedOut: (request: PendingApprovalRecord, now: string) => Promise<unknown>;
 *   parseApprovalNotes: (notes?: string | null) => ApprovalNotesState;
 *   shouldSendReminder: (notesState: ApprovalNotesState, nowMs: number) => boolean;
 *   updateApprovalRequest: (applicationId: string, patch: Record<string, unknown>) => Promise<unknown>;
 *   stringifyApprovalNotes: (notesState: ApprovalNotesState) => string;
 * }} ApprovalContext
 */

const HOUR_MS = 60 * 60 * 1000;

function toIso(value = Date.now()) {
  return new Date(value).toISOString();
}

/**
 * @param {{ d1Client: { query: (sql: string, ...params: unknown[]) => Promise<PendingApprovalRecord[]> } }} applicationRepository
 * @returns {Promise<PendingApprovalRecord[]>}
 */
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

/**
 * @param {ApprovalContext} context
 * @param {string} applicationId
 */
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

/**
 * @param {ApprovalContext} context
 */
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

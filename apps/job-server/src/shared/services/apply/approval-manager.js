import { ApplicationRepository } from '../../repositories/application-repository.js';
import { TelegramNotificationAdapter } from '../notifications/telegram-adapter.js';
import { AppError, ErrorCodes, ValidationError } from '../../errors/index.js';

const HOUR_MS = 60 * 60 * 1000;

function toIso(value = Date.now()) {
  return new Date(value).toISOString();
}

function asNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export class ApprovalWorkflowManager {
  constructor(options = {}) {
    this.applicationRepository = options.applicationRepository || new ApplicationRepository();
    this.notificationAdapter = options.notificationAdapter || new TelegramNotificationAdapter();
    this.logger = options.logger || console;
    this.config = {
      approvalTimeoutHours: asNumber(options.config?.approvalTimeoutHours, 24),
      reminderIntervalHours: asNumber(options.config?.reminderIntervalHours, 6),
      maxReminders: asNumber(options.config?.maxReminders, 3),
    };
  }

  async requestApproval(job, matchScore) {
    const score = Number(matchScore);
    if (!Number.isFinite(score) || score < 60 || score > 74) {
      throw new ValidationError('requestApproval requires score in range 60-74', {
        fields: ['matchScore'],
      });
    }

    const applicationId = this.#resolveApplicationId(job);
    const application = await this.applicationRepository.findById(applicationId);
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

    const notes = this.#stringifyNotes({
      reason: null,
      reminderCount: 0,
      lastReminderAt: null,
      events: [{ type: 'requested', at: now }],
    });

    await this.#upsertApprovalRequest({
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

    await this.applicationRepository.updateStatus(
      applicationId,
      'pending',
      `Manual approval required (match score ${score})`
    );

    const notification = await this.notificationAdapter.sendApprovalRequest(
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
      expiresAt: toIso(Date.now() + this.config.approvalTimeoutHours * HOUR_MS),
    };
  }

  async approve(applicationId, reviewer = 'unknown') {
    const request = await this.#getApprovalRequestById(applicationId);
    this.#assertPendingRequest(request, applicationId);

    const now = toIso();
    const notesState = this.#parseNotes(request.notes);
    notesState.events.push({ type: 'approved', at: now, reviewer });

    await this.#updateApprovalRequest(applicationId, {
      status: 'approved',
      reviewed_by: reviewer,
      reviewed_at: now,
      notes: this.#stringifyNotes(notesState),
      updated_at: now,
    });

    await this.applicationRepository.updateStatus(
      applicationId,
      'can_apply',
      `Approved by ${reviewer}`
    );
    await this.applicationRepository.update(applicationId, { approved_at: now, rejected_at: null });

    return {
      applicationId,
      status: 'approved',
      nextStatus: 'can_apply',
      reviewer,
      reviewedAt: now,
    };
  }

  async reject(applicationId, reviewer = 'unknown', reason = 'Rejected by reviewer') {
    const request = await this.#getApprovalRequestById(applicationId);
    this.#assertPendingRequest(request, applicationId);

    const now = toIso();
    const notesState = this.#parseNotes(request.notes);
    notesState.reason = reason;
    notesState.events.push({ type: 'rejected', at: now, reviewer, reason });

    await this.#updateApprovalRequest(applicationId, {
      status: 'rejected',
      reviewed_by: reviewer,
      reviewed_at: now,
      notes: this.#stringifyNotes(notesState),
      updated_at: now,
    });

    await this.applicationRepository.updateStatus(
      applicationId,
      'skip',
      `Rejected by ${reviewer}: ${reason}`
    );
    await this.applicationRepository.update(applicationId, { rejected_at: now });

    return {
      applicationId,
      status: 'rejected',
      nextStatus: 'skip',
      reviewer,
      reason,
      reviewedAt: now,
    };
  }

  async getPendingApprovals() {
    return await this.applicationRepository.d1Client.query(
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

  async checkApprovalStatus(applicationId) {
    if (!applicationId || typeof applicationId !== 'string') {
      throw new ValidationError('applicationId is required', {
        fields: ['applicationId'],
      });
    }

    const request = await this.#getApprovalRequestById(applicationId);
    if (!request) {
      return {
        applicationId,
        status: 'not_requested',
        pending: false,
      };
    }

    const createdAtMs = Date.parse(request.created_at || toIso());
    const expiresAtMs = createdAtMs + this.config.approvalTimeoutHours * HOUR_MS;

    return {
      applicationId,
      status: request.status,
      pending: request.status === 'pending',
      reviewedBy: request.reviewed_by || null,
      reviewedAt: request.reviewed_at || null,
      createdAt: request.created_at,
      expiresAt: toIso(expiresAtMs),
      notes: this.#parseNotes(request.notes),
    };
  }

  async processTimeouts() {
    const nowMs = Date.now();
    const now = toIso(nowMs);
    const pending = await this.getPendingApprovals();

    const summary = {
      checked: pending.length,
      timedOut: 0,
      remindersSent: 0,
      reminderSkipped: 0,
    };

    for (const request of pending) {
      const createdAtMs = Date.parse(request.created_at || now);
      const ageMs = nowMs - createdAtMs;

      if (ageMs >= this.config.approvalTimeoutHours * HOUR_MS) {
        await this.#markTimedOut(request, now);
        summary.timedOut += 1;
        continue;
      }

      const notesState = this.#parseNotes(request.notes);
      if (!this.#shouldSendReminder(notesState, nowMs)) {
        summary.reminderSkipped += 1;
        continue;
      }

      const notification = await this.notificationAdapter.sendApprovalRequest(
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

      await this.#updateApprovalRequest(request.id, {
        notes: this.#stringifyNotes(notesState),
        updated_at: now,
      });

      if (notification?.sent) {
        summary.remindersSent += 1;
      }
    }

    return summary;
  }

  async cancelApproval(applicationId) {
    const request = await this.#getApprovalRequestById(applicationId);
    this.#assertPendingRequest(request, applicationId);

    const now = toIso();
    const notesState = this.#parseNotes(request.notes);
    notesState.events.push({ type: 'cancelled', at: now });

    await this.#updateApprovalRequest(applicationId, {
      status: 'rejected',
      reviewed_by: 'system:cancelled',
      reviewed_at: now,
      notes: this.#stringifyNotes(notesState),
      updated_at: now,
    });

    await this.applicationRepository.updateStatus(
      applicationId,
      'skip',
      'Approval request cancelled before review'
    );

    return {
      applicationId,
      status: 'cancelled',
      nextStatus: 'skip',
      cancelledAt: now,
    };
  }

  async #upsertApprovalRequest({
    id,
    workflowId,
    jobId,
    jobTitle,
    company,
    platform,
    matchScore,
    notes,
    now,
  }) {
    await this.applicationRepository.d1Client.query(
      `
        INSERT INTO approval_requests (
          id, workflow_id, job_id, job_title, company, platform,
          match_score, status, reviewed_by, reviewed_at, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          workflow_id = excluded.workflow_id,
          job_id = excluded.job_id,
          job_title = excluded.job_title,
          company = excluded.company,
          platform = excluded.platform,
          match_score = excluded.match_score,
          status = 'pending',
          reviewed_by = NULL,
          reviewed_at = NULL,
          notes = excluded.notes,
          updated_at = excluded.updated_at
      `,
      [id, workflowId, jobId, jobTitle, company, platform, matchScore, notes, now, now]
    );
  }

  async #getApprovalRequestById(applicationId) {
    const rows = await this.applicationRepository.d1Client.query(
      'SELECT * FROM approval_requests WHERE id = ? LIMIT 1',
      [applicationId]
    );
    return rows[0] || null;
  }

  async #updateApprovalRequest(applicationId, patch) {
    const allowedFields = {
      status: patch.status,
      reviewed_by: patch.reviewed_by,
      reviewed_at: patch.reviewed_at,
      notes: patch.notes,
      updated_at: patch.updated_at || toIso(),
    };

    const entries = Object.entries(allowedFields).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      return;
    }

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, value]) => value);
    values.push(applicationId);

    await this.applicationRepository.d1Client.query(
      `UPDATE approval_requests SET ${setClause} WHERE id = ?`,
      values
    );
  }

  async #markTimedOut(request, now) {
    const notesState = this.#parseNotes(request.notes);
    notesState.reason = 'Timed out after approval window elapsed';
    notesState.events.push({ type: 'timeout', at: now });

    await this.#updateApprovalRequest(request.id, {
      status: 'timeout',
      reviewed_by: 'system:timeout',
      reviewed_at: now,
      notes: this.#stringifyNotes(notesState),
      updated_at: now,
    });

    await this.applicationRepository.updateStatus(
      request.id,
      'rejected',
      `Auto-rejected after ${this.config.approvalTimeoutHours}h timeout`
    );
    await this.applicationRepository.update(request.id, { rejected_at: now });
  }

  #resolveApplicationId(job) {
    const applicationId = job?.applicationId || job?.application_id || job?.id;
    if (!applicationId || typeof applicationId !== 'string') {
      throw new ValidationError('job.applicationId (or id) is required', {
        fields: ['job.applicationId'],
      });
    }
    return applicationId;
  }

  #assertPendingRequest(request, applicationId) {
    if (!request) {
      throw new AppError('Approval request not found', ErrorCodes.NOT_FOUND, 404, {
        applicationId,
      });
    }

    if (request.status !== 'pending') {
      throw new AppError('Approval request is not pending', ErrorCodes.VALIDATION, 409, {
        applicationId,
        status: request.status,
      });
    }
  }

  #parseNotes(notes) {
    if (!notes) {
      return {
        reason: null,
        reminderCount: 0,
        lastReminderAt: null,
        events: [],
      };
    }

    try {
      const parsed = JSON.parse(notes);
      return {
        reason: parsed.reason || null,
        reminderCount: asNumber(parsed.reminderCount, 0),
        lastReminderAt: parsed.lastReminderAt || null,
        events: Array.isArray(parsed.events) ? parsed.events : [],
      };
    } catch {
      return {
        reason: String(notes),
        reminderCount: 0,
        lastReminderAt: null,
        events: [],
      };
    }
  }

  #stringifyNotes(noteState) {
    return JSON.stringify({
      reason: noteState.reason || null,
      reminderCount: asNumber(noteState.reminderCount, 0),
      lastReminderAt: noteState.lastReminderAt || null,
      events: Array.isArray(noteState.events) ? noteState.events : [],
    });
  }

  #shouldSendReminder(notesState, nowMs) {
    if (notesState.reminderCount >= this.config.maxReminders) {
      return false;
    }

    const baselineMs = Date.parse(notesState.lastReminderAt || '') || 0;
    if (baselineMs === 0) {
      return true;
    }

    return nowMs - baselineMs >= this.config.reminderIntervalHours * HOUR_MS;
  }
}

export default ApprovalWorkflowManager;

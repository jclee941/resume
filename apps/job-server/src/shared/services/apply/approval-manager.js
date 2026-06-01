import { ApplicationRepository } from '../../repositories/application-repository.js';
import { TelegramNotificationAdapter } from '../notifications/telegram-adapter.js';

import { getApprovalRequestById, markTimedOut, updateApprovalRequest } from './approval-store.js';
import {
  parseApprovalNotes,
  shouldSendReminder,
  stringifyApprovalNotes,
} from './approval-notes.js';
import { assertPendingRequest } from './approval-validation.js';
import { requestApproval } from './approval-requester.js';
import { approveRequest, cancelApproval, rejectRequest } from './approval-reviewer.js';
import { checkApprovalStatus, getPendingApprovals, processTimeouts } from './approval-processor.js';

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
    return await requestApproval(this, job, matchScore);
  }

  async approve(applicationId, reviewer = 'unknown') {
    return await approveRequest(this, applicationId, reviewer);
  }

  async reject(applicationId, reviewer = 'unknown', reason = 'Rejected by reviewer') {
    return await rejectRequest(this, applicationId, reviewer, reason);
  }

  async getPendingApprovals() {
    return await getPendingApprovals(this.applicationRepository);
  }

  async checkApprovalStatus(applicationId) {
    return await checkApprovalStatus(this, applicationId);
  }

  async processTimeouts() {
    return await processTimeouts(this);
  }

  async cancelApproval(applicationId) {
    return await cancelApproval(this, applicationId);
  }

  async getApprovalRequestById(applicationId) {
    return await getApprovalRequestById(this.applicationRepository, applicationId);
  }

  async updateApprovalRequest(applicationId, patch) {
    return await updateApprovalRequest(this.applicationRepository, applicationId, patch);
  }

  async markTimedOut(request, now) {
    return await markTimedOut(
      this.applicationRepository,
      request,
      now,
      this.config.approvalTimeoutHours,
      parseApprovalNotes,
      stringifyApprovalNotes
    );
  }

  assertPendingRequest(request, applicationId) {
    return assertPendingRequest(request, applicationId);
  }

  parseApprovalNotes(notes) {
    return parseApprovalNotes(notes);
  }

  stringifyApprovalNotes(noteState) {
    return stringifyApprovalNotes(noteState);
  }

  shouldSendReminder(notesState, nowMs) {
    return shouldSendReminder(notesState, nowMs, this.config);
  }
}

export default ApprovalWorkflowManager;

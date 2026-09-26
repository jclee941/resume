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

/**
 * @typedef {Object} ApprovalWorkflowConfig
 * @property {number} approvalTimeoutHours
 * @property {number} reminderIntervalHours
 * @property {number} maxReminders
 */

/**
 * @typedef {Object} ApprovalWorkflowOptions
 * @property {ApplicationRepository} [applicationRepository]
 * @property {TelegramNotificationAdapter} [notificationAdapter]
 * @property {Console | { info?: (msg: string) => void; error?: (msg: string, ...args: unknown[]) => void }} [logger]
 * @property {Partial<ApprovalWorkflowConfig>} [config]
 */

/**
 * @param {unknown} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
function asNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export class ApprovalWorkflowManager {
  /**
   * @param {ApprovalWorkflowOptions} [options]
   */
  constructor(options = {}) {
    /** @type {ApplicationRepository & import('./approval-processor.js').ApprovalContext['applicationRepository']} */
    this.applicationRepository =
      /** @type {ApplicationRepository & import('./approval-processor.js').ApprovalContext['applicationRepository']} */ (
        options.applicationRepository || new ApplicationRepository()
      );
    /** @type {TelegramNotificationAdapter & import('./approval-processor.js').ApprovalContext['notificationAdapter']} */
    this.notificationAdapter =
      /** @type {TelegramNotificationAdapter & import('./approval-processor.js').ApprovalContext['notificationAdapter']} */ (
        options.notificationAdapter || new TelegramNotificationAdapter()
      );
    this.logger = options.logger || console;
    this.config = {
      approvalTimeoutHours: asNumber(options.config?.approvalTimeoutHours, 24),
      reminderIntervalHours: asNumber(options.config?.reminderIntervalHours, 6),
      maxReminders: asNumber(options.config?.maxReminders, 3),
    };
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {number | string} matchScore
   */
  async requestApproval(job, matchScore) {
    return await requestApproval(this, job, matchScore);
  }

  /**
   * @param {string} applicationId
   * @param {string} [reviewer='unknown']
   */
  async approve(applicationId, reviewer = 'unknown') {
    return await approveRequest(this, applicationId, reviewer);
  }

  /**
   * @param {string} applicationId
   * @param {string} [reviewer='unknown']
   * @param {string} [reason='Rejected by reviewer']
   */
  async reject(applicationId, reviewer = 'unknown', reason = 'Rejected by reviewer') {
    return await rejectRequest(this, applicationId, reviewer, reason);
  }

  async getPendingApprovals() {
    return await getPendingApprovals(this.applicationRepository);
  }

  /**
   * @param {string} applicationId
   */
  async checkApprovalStatus(applicationId) {
    return await checkApprovalStatus(this, applicationId);
  }

  async processTimeouts() {
    return await processTimeouts(this);
  }

  /**
   * @param {string} applicationId
   */
  async cancelApproval(applicationId) {
    return await cancelApproval(this, applicationId);
  }

  /**
   * @param {string} applicationId
   * @returns {Promise<import('./approval-processor.js').PendingApprovalRecord>}
   */
  async getApprovalRequestById(applicationId) {
    return await /** @type {Promise<import('./approval-processor.js').PendingApprovalRecord>} */ (
      getApprovalRequestById(this.applicationRepository, applicationId)
    );
  }

  /**
   * @param {string} applicationId
   * @param {Record<string, unknown>} patch
   */
  async updateApprovalRequest(applicationId, patch) {
    return await updateApprovalRequest(this.applicationRepository, applicationId, patch);
  }

  /**
   * @param {import('./approval-store.js').ApprovalRequest} request
   * @param {string} now
   */
  async markTimedOut(request, now) {
    return await markTimedOut(
      this.applicationRepository,
      request,
      now,
      this.config.approvalTimeoutHours,
      /** @type {(notes?: string | null) => import('./approval-store.js').NotesState} */ (
        parseApprovalNotes
      ),
      stringifyApprovalNotes
    );
  }

  /**
   * @param {{ status?: unknown } | null | undefined} request
   * @param {string} applicationId
   */
  assertPendingRequest(request, applicationId) {
    return assertPendingRequest(request, applicationId);
  }

  /**
   * @param {string | null | undefined} [notes]
   * @returns {import('./approval-notes.js').ApprovalNotesState}
   */
  parseApprovalNotes(notes) {
    return parseApprovalNotes(notes);
  }

  /**
   * @param {unknown} noteState
   */
  stringifyApprovalNotes(noteState) {
    return stringifyApprovalNotes(
      /** @type {Partial<import('./approval-notes.js').ApprovalNotesState>} */ (noteState)
    );
  }

  /**
   * @param {import('./approval-notes.js').ApprovalNotesState} notesState
   * @param {number} nowMs
   */
  shouldSendReminder(notesState, nowMs) {
    return shouldSendReminder(notesState, nowMs, this.config);
  }
}

export default ApprovalWorkflowManager;

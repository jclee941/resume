import { WorkflowEntrypoint } from 'cloudflare:workers';
import {
  createApprovalRequest,
  getApprovalStatus,
  getDailyApplicationCount,
  logWorkflowStep,
  recordApplication,
  saveWorkflowState,
} from './application/database.js';
import { runApplicationWorkflow } from './application/workflow-runner.js';
import {
  generateCoverLetter,
  buildCoverLetterPrompt,
  getMatchingConfig,
  getResume,
  getStoredResume,
  getTemplateCoverLetter,
  sendApprovalRequestNotification,
  sendNotification,
} from './application/profile.js';
import {
  searchJobs,
  searchLinkedIn,
  searchRemember,
  searchWanted,
} from './application/platforms.js';
import {
  submitApplication,
  submitToJobKorea,
  submitToLinkedIn,
  submitToRemember,
  submitToSaramin,
  submitToWanted,
} from './application/application-submitters.js';

/**
 * @typedef {{
 *   triggerType?: string;
 *   platforms?: string[];
 *   searchCriteria?: Record<string, unknown>;
 *   resumeId?: string;
 *   autoApprove?: boolean;
 *   autoApproveThreshold?: number;
 *   minMatchScore?: number;
 *   maxDailyApplications?: number;
 *   dryRun?: boolean;
 *   atsStub?: boolean;
 *   explicitSubmit?: boolean;
 *   submitOptIn?: boolean;
 *   candidates?: unknown[];
 *   _eventData?: Record<string, unknown>;
 *   [key: string]: unknown;
 * }} ApplicationWorkflowParams
 *
 * @typedef {import('../services/notifications.js').NotificationEnv & {
 *   JOB_DB: import('./application/database.js').D1DatabaseLike & import('./application/approval-gates.js').ApprovalDb;
 *   SESSIONS: import('../services/notifications.js').KvNamespaceLike & { get(key: string): Promise<string | null> };
 *   ENCRYPTION_KEY?: string;
 *   MYBROWSER?: import('@cloudflare/puppeteer').BrowserWorker;
 *   AI?: import('./application/profile.js').AiBinding;
 *   [key: string]: unknown;
 * }} ApplicationWorkflowEnv
 */

/**
 * Application Workflow - Enhanced for Batch Processing with Approval Gates
 *
 * Multi-step job application process with:
 * - Batch job searching and filtering
 * - Approval gates with match score thresholds
 * - Durable execution with step.do()
 * - D1 storage for workflow tracking
 * - Cron, manual, and event trigger support
 * - Partial failure handling
 *
 * @extends {WorkflowEntrypoint<ApplicationWorkflowEnv, ApplicationWorkflowParams>}
 */
export class ApplicationWorkflow extends WorkflowEntrypoint {
  /**
   * @param {import('cloudflare:workers').WorkflowEvent<ApplicationWorkflowParams>} event
   * @param {import('cloudflare:workers').WorkflowStep} step
   * @returns {Promise<unknown>}
   */
  async run(event, step) {
    return runApplicationWorkflow(this, event, step);
  }

  /**
   * @param {import('./application/workflow-records.js').WorkflowRecord} workflow
   * @returns {Promise<unknown>}
   */
  async saveWorkflowState(workflow) {
    return saveWorkflowState(this, workflow);
  }

  /**
   * @param {string} workflowId
   * @param {string} stepName
   * @param {string} status
   * @param {Record<string, unknown>} [details]
   * @returns {Promise<unknown>}
   */
  async logWorkflowStep(workflowId, stepName, status, details = {}) {
    return logWorkflowStep(this, workflowId, stepName, status, details);
  }

  /**
   * @param {string} workflowId
   * @param {import('./application/database.js').ApplicationJob} job
   * @param {string} status
   * @param {number} matchScore
   * @param {Record<string, unknown>} [approvalMetadata]
   * @returns {Promise<string>}
   */
  async createApprovalRequest(workflowId, job, status, matchScore, approvalMetadata) {
    return createApprovalRequest(this, workflowId, job, status, matchScore, approvalMetadata);
  }

  /**
   * @param {string} requestId
   * @returns {Promise<string>}
   */
  async getApprovalStatus(requestId) {
    return getApprovalStatus(this, requestId);
  }

  /**
   * @param {import('./application/database.js').ApplicationRecord} params
   * @returns {Promise<unknown>}
   */
  async recordApplication(params) {
    return recordApplication(this, params);
  }

  /**
   * @param {string} date
   * @returns {Promise<number>}
   */
  async getDailyApplicationCount(date) {
    return getDailyApplicationCount(this, date);
  }

  /**
   * @this {ApplicationWorkflow & import('./application/platforms.js').PlatformSearchContext}
   * @param {string} platform
   * @param {import('./application/platforms.js').PlatformSearchCriteria} criteria
   * @returns {Promise<Array<Record<string, unknown>>>}
   */
  async searchJobs(platform, criteria) {
    return searchJobs(this, platform, criteria);
  }

  /**
   * @this {ApplicationWorkflow & import('./application/platforms.js').PlatformSearchContext}
   * @param {import('./application/platforms.js').PlatformSearchCriteria} criteria
   * @returns {Promise<Array<Record<string, unknown>>>}
   */
  async searchWanted(criteria) {
    return searchWanted(this, criteria);
  }

  /**
   * @this {ApplicationWorkflow & import('./application/platforms.js').PlatformSearchContext}
   * @param {import('./application/platforms.js').PlatformSearchCriteria} criteria
   * @returns {Promise<Array<Record<string, unknown>>>}
   */
  async searchLinkedIn(criteria) {
    return searchLinkedIn(this, criteria);
  }

  /**
   * @this {ApplicationWorkflow & import('./application/platforms.js').PlatformSearchContext}
   * @param {import('./application/platforms.js').PlatformSearchCriteria} criteria
   * @returns {Promise<Array<Record<string, unknown>>>}
   */
  async searchRemember(criteria) {
    return searchRemember(this, criteria);
  }

  /**
   * @param {import('./application/application-submitters.js').SubmitApplicationParams} params
   * @returns {Promise<import('./application/application-submitters.js').SubmitResult>}
   */
  async submitApplication(params) {
    return submitApplication(this, params);
  }

  /**
   * @param {string} jobId
   * @param {import('./application/application-submitters.js').SubmitResume | null | undefined} resume
   * @param {string} [coverLetter]
   * @returns {Promise<import('./application/application-submitters.js').SubmitResult>}
   */
  async submitToWanted(jobId, resume, coverLetter) {
    return submitToWanted(this, jobId, resume, coverLetter);
  }

  /**
   * @param {string} jobId
   * @param {import('./application/application-submitters.js').SubmitResume | null | undefined} resume
   * @param {string} [coverLetter]
   * @returns {Promise<import('./application/application-submitters.js').SubmitResult>}
   */
  async submitToLinkedIn(jobId, resume, coverLetter) {
    return submitToLinkedIn(this, jobId, resume, coverLetter);
  }

  /**
   * @param {string} jobId
   * @param {import('./application/application-submitters.js').SubmitResume | null | undefined} resume
   * @param {string} [coverLetter]
   * @returns {Promise<import('./application/application-submitters.js').SubmitResult>}
   */
  async submitToRemember(jobId, resume, coverLetter) {
    return submitToRemember(this, jobId, resume, coverLetter);
  }

  /**
   * @param {string} jobId
   * @param {import('./application/application-submitters.js').SubmitResume | null | undefined} resume
   * @param {string} [coverLetter]
   * @param {import('./application/application-submitters.js').SubmitterOptions} [options]
   * @returns {Promise<import('./application/application-submitters.js').SubmitResult>}
   */
  async submitToJobKorea(jobId, resume, coverLetter, options) {
    return submitToJobKorea(this, jobId, resume, coverLetter, options);
  }

  /**
   * @param {string} jobId
   * @param {import('./application/application-submitters.js').SubmitResume | null | undefined} resume
   * @param {string} [coverLetter]
   * @param {import('./application/application-submitters.js').SubmitterOptions} [options]
   * @returns {Promise<import('./application/application-submitters.js').SubmitResult>}
   */
  async submitToSaramin(jobId, resume, coverLetter, options) {
    return submitToSaramin(this, jobId, resume, coverLetter, options);
  }

  /**
   * @param {import('./application/profile.js').JobProfile} job
   * @returns {Promise<string>}
   */
  async generateCoverLetter(job) {
    return generateCoverLetter(this, job);
  }

  /**
   * @param {import('./application/profile.js').JobProfile} job
   * @param {{ skills?: string; experience?: string } | null} resume
   * @returns {string}
   */
  buildCoverLetterPrompt(job, resume) {
    return buildCoverLetterPrompt(this, job, resume);
  }

  /**
   * @param {import('./application/profile.js').JobProfile} job
   * @returns {string}
   */
  getTemplateCoverLetter(job) {
    return getTemplateCoverLetter(this, job);
  }

  /**
   * @param {string} resumeId
   * @returns {Promise<{ data?: string; [key: string]: unknown } | null>}
   */
  async getResume(resumeId) {
    return getResume(this, resumeId);
  }

  /**
   * @returns {Promise<{ skills: string; experience: string } | null>}
   */
  async getStoredResume() {
    return getStoredResume(this);
  }

  /**
   * @returns {Promise<import('./application/matching-config.js').MatchingConfig>}
   */
  async getMatchingConfig() {
    return getMatchingConfig(this);
  }

  /**
   * @param {string} workflowId
   * @param {string} requestId
   * @param {import('./application/profile.js').JobProfile} job
   * @returns {Promise<void>}
   */
  async sendApprovalRequestNotification(workflowId, requestId, job) {
    return sendApprovalRequestNotification(this, workflowId, requestId, job);
  }

  /**
   * @param {string} message
   * @returns {Promise<void>}
   */
  async sendNotification(message) {
    return sendNotification(this, message);
  }
}

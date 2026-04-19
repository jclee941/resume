import { WorkflowEntrypoint } from 'cloudflare:workers';
import {
  createApprovalRequest,
  getApprovalStatus,
  getDailyApplicationCount,
  logWorkflowStep,
  recordApplication,
  saveWorkflowState,
} from './application/database.js';
import { runApplicationWorkflow } from './application/orchestration.js';
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
  submitApplication,
  submitToJobKorea,
  submitToLinkedIn,
  submitToRemember,
  submitToSaramin,
  submitToWanted,
} from './application/platforms.js';

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
 * @param {Object} params
 * @param {string} params.triggerType - 'cron' | 'manual' | 'event'
 * @param {string[]} params.platforms - Platforms to search ['wanted', 'linkedin', 'remember']
 * @param {Object} params.searchCriteria - Search filters
 * @param {string} params.resumeId - Resume ID to use
 * @param {boolean} params.autoApprove - Auto-approve high-match jobs
 * @param {number} params.autoApproveThreshold - Score threshold for auto-approval (default: 75)
 * @param {number} params.minMatchScore - Minimum match score to consider (default: 60)
 * @param {number} params.maxDailyApplications - Max applications per run (default: 10)
 * @param {boolean} params.dryRun - Preview mode without actual applications
 */
export class ApplicationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    return runApplicationWorkflow(this, event, step);
  }

  async saveWorkflowState(workflow) {
    return saveWorkflowState(this, workflow);
  }

  async logWorkflowStep(workflowId, stepName, status, details = {}) {
    return logWorkflowStep(this, workflowId, stepName, status, details);
  }

  async createApprovalRequest(workflowId, job, status, matchScore) {
    return createApprovalRequest(this, workflowId, job, status, matchScore);
  }

  async getApprovalStatus(requestId) {
    return getApprovalStatus(this, requestId);
  }

  async recordApplication(params) {
    return recordApplication(this, params);
  }

  async getDailyApplicationCount(date) {
    return getDailyApplicationCount(this, date);
  }

  async searchJobs(platform, criteria) {
    return searchJobs(this, platform, criteria);
  }

  async searchWanted(criteria) {
    return searchWanted(this, criteria);
  }

  async searchLinkedIn(criteria) {
    return searchLinkedIn(this, criteria);
  }

  async searchRemember(criteria) {
    return searchRemember(this, criteria);
  }

  async submitApplication(params) {
    return submitApplication(this, params);
  }

  async submitToWanted(jobId, resume, coverLetter) {
    return submitToWanted(this, jobId, resume, coverLetter);
  }

  async submitToLinkedIn(jobId, resume, coverLetter) {
    return submitToLinkedIn(this, jobId, resume, coverLetter);
  }

  async submitToRemember(jobId, resume, coverLetter) {
    return submitToRemember(this, jobId, resume, coverLetter);
  }

  async submitToJobKorea(jobId, resume, coverLetter) {
    return submitToJobKorea(this, jobId, resume, coverLetter);
  }

  async submitToSaramin(jobId, resume, coverLetter) {
    return submitToSaramin(this, jobId, resume, coverLetter);
  }

  async generateCoverLetter(job) {
    return generateCoverLetter(this, job);
  }

  buildCoverLetterPrompt(job, resume) {
    return buildCoverLetterPrompt(this, job, resume);
  }

  getTemplateCoverLetter(job) {
    return getTemplateCoverLetter(this, job);
  }

  async getResume(resumeId) {
    return getResume(this, resumeId);
  }

  async getStoredResume() {
    return getStoredResume(this);
  }

  async getMatchingConfig() {
    return getMatchingConfig(this);
  }

  async sendApprovalRequestNotification(workflowId, requestId, job) {
    return sendApprovalRequestNotification(this, workflowId, requestId, job);
  }

  async sendNotification(message) {
    return sendNotification(this, message);
  }
}

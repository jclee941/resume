import {
  assignAutoApplierDependencies,
  createAutoApplierConfig,
  createAutoApplierDependencies,
} from './auto-applier-dependencies.js';
import { createAutoApplierJobFilter } from './auto-applier-filter.js';
import { runAutoApply } from './auto-applier-runner.js';
import { applyToJob } from './auto-applier-strategy-router.js';
import { processJob } from './auto-applier-pipeline/process-job.js';
import { shouldApply, handleApproval } from './auto-applier-pipeline/approval-flow.js';
import { submitApplication } from './auto-applier-pipeline/submission-flow.js';
import { getExistingJobKeys } from './auto-applier-pipeline/pipeline-stages.js';
import {
  findByText,
  findElementWithText,
  initBrowser,
  loadCookies,
  closeBrowser,
} from './browser-helpers.js';
import {
  applyToWanted,
  applyToJobKorea,
  applyToSaramin,
  applyToLinkedIn,
} from './strategies/index.js';
/**
 * @typedef {import('./auto-applier-dependencies.js').AutoApplierOptions} AutoApplierOptions
 * @typedef {import('./auto-applier-dependencies.js').AutoApplierDependencies} AutoApplierDependencies
 * @typedef {import('./auto-applier-pipeline/submission-flow.js').SubmissionJob} SubmissionJob
 * @typedef {import('./auto-applier-pipeline/submission-flow.js').SubmissionResult} SubmissionResult
 * @typedef {import('./auto-applier-strategy-router.js').JobWithSource} JobWithSource
 * @typedef {import('./auto-applier-pipeline/pipeline-stages.js').TrackedApplicationRecord} TrackedApplicationRecord
 */

export class AutoApplier {
  /**
   * @param {AutoApplierOptions} [options]
   */
  constructor(options = {}) {
    this.logger = options.logger || console;

    assignAutoApplierDependencies(this, createAutoApplierDependencies(options, this.logger));

    this.config = createAutoApplierConfig(options);
    this.jobFilter = createAutoApplierJobFilter(options, this.config, this.logger);

    this.browser = null;
    this.page = null;
  }

  /**
   * @param {string} tag
   * @param {string} text
   * @param {string | null} [cssAlternative]
   */
  async findByText(tag, text, cssAlternative = null) {
    return /** @type {Function} */ (findByText).call(this, tag, text, cssAlternative);
  }

  /**
   * @param {string} text
   */
  async findElementWithText(text) {
    return findElementWithText.call(this, text);
  }

  async initBrowser() {
    return /** @type {Function} */ (initBrowser).call(this);
  }

  /**
   * @param {string | Record<string, string>[]} cookies
   * @param {string} [domain]
   */
  async loadCookies(cookies, domain = '.wanted.co.kr') {
    return loadCookies.call(this, cookies, domain);
  }

  async closeBrowser() {
    return /** @type {Function} */ (closeBrowser).call(this);
  }

  /**
   * @param {Record<string, unknown>} [options]
   */
  async run(options = {}) {
    return runAutoApply.call(
      /** @type {this & import('./auto-applier-runner.js').AutoApplierContext} */ (this),
      options
    );
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {Record<string, unknown>} [context]
   */
  async processJob(job, context = {}) {
    return processJob.call(this, job, context);
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {TrackedApplicationRecord | null} [trackedApplication]
   */
  async shouldApply(job, trackedApplication = null) {
    return shouldApply.call(
      /** @type {this & import('./auto-applier-pipeline/approval-flow.js').ApprovalFlowContext} */ (
        this
      ),
      job,
      trackedApplication
    );
  }

  /**
   * @param {SubmissionJob} job
   */
  async submitApplication(job) {
    return submitApplication.call(
      /** @type {this & { retryService: { execute<T>(fn: () => Promise<T>, options?: { serviceName?: string }): Promise<T> }; applyToJob(job: SubmissionJob): Promise<SubmissionResult> }} */ (
        this
      ),
      job
    );
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {TrackedApplicationRecord | null} [trackedApplication]
   */
  async handleApproval(job, trackedApplication = null) {
    return handleApproval.call(
      /** @type {this & import('./auto-applier-pipeline/approval-flow.js').ApprovalFlowContext} */ (
        this
      ),
      job,
      trackedApplication
    );
  }

  async getExistingJobKeys() {
    return getExistingJobKeys.call(
      /** @type {this & { repository: { findTodayApplications(): Promise<{ company?: string; position?: string }[]> } }} */ (
        this
      )
    );
  }

  /**
   * @param {JobWithSource} job
   */
  async applyToJob(job) {
    return applyToJob.call(this, job);
  }

  /**
   * @param {JobWithSource} job
   */
  async applyToWanted(job) {
    return applyToWanted.call(this, job);
  }

  /**
   * @param {JobWithSource} job
   */
  async applyToJobKorea(job) {
    return applyToJobKorea.call(this, job);
  }

  /**
   * @param {JobWithSource} job
   */
  async applyToSaramin(job) {
    return applyToSaramin.call(this, job);
  }

  /**
   * @param {JobWithSource} job
   */
  async applyToLinkedIn(job) {
    return applyToLinkedIn.call(this, job);
  }

  /**
   * @param {Record<string, unknown>} [filters]
   */
  getApplications(filters = {}) {
    return /** @type {this & AutoApplierDependencies} */ (this).appManager.listApplications(
      filters
    );
  }

  getStats() {
    return /** @type {this & AutoApplierDependencies} */ (this).appManager.getStats();
  }

  /**
   * @param {string} [date]
   */
  getDailyReport(date) {
    return /** @type {this & AutoApplierDependencies} */ (this).appManager.generateDailyReport(
      date
    );
  }

  /**
   * @param {number} ms
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default AutoApplier;

import {
  assignAutoApplierDependencies,
  createAutoApplierConfig,
  createAutoApplierDependencies,
} from './auto-applier-dependencies.js';
import { createAutoApplierJobFilter } from './auto-applier-filter.js';
import { runAutoApply } from './auto-applier-runner.js';
import { applyToJob } from './auto-applier-strategy-router.js';
import {
  processJob,
  shouldApply,
  submitApplication,
  handleApproval,
  getExistingJobKeys,
} from './auto-applier-pipeline.js';
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
export class AutoApplier {
  constructor(options = {}) {
    this.logger = options.logger || console;

    assignAutoApplierDependencies(this, createAutoApplierDependencies(options, this.logger));

    this.config = createAutoApplierConfig(options);
    this.jobFilter = createAutoApplierJobFilter(options, this.config, this.logger);

    this.browser = null;
    this.page = null;
  }

  async findByText(tag, text, cssAlternative = null) {
    return findByText.call(this, tag, text, cssAlternative);
  }

  async findElementWithText(text) {
    return findElementWithText.call(this, text);
  }

  async initBrowser() {
    return initBrowser.call(this);
  }

  async loadCookies(cookies, domain = '.wanted.co.kr') {
    return loadCookies.call(this, cookies, domain);
  }

  async closeBrowser() {
    return closeBrowser.call(this);
  }

  async run(options = {}) {
    return runAutoApply.call(this, options);
  }

  async processJob(job, context = {}) {
    return processJob.call(this, job, context);
  }

  async shouldApply(job, trackedApplication = null) {
    return shouldApply.call(this, job, trackedApplication);
  }

  async submitApplication(job) {
    return submitApplication.call(this, job);
  }

  async handleApproval(job, trackedApplication = null) {
    return handleApproval.call(this, job, trackedApplication);
  }

  async getExistingJobKeys() {
    return getExistingJobKeys.call(this);
  }

  async applyToJob(job) {
    return applyToJob.call(this, job);
  }

  async applyToWanted(job) {
    return applyToWanted.call(this, job);
  }

  async applyToJobKorea(job) {
    return applyToJobKorea.call(this, job);
  }

  async applyToSaramin(job) {
    return applyToSaramin.call(this, job);
  }

  async applyToLinkedIn(job) {
    return applyToLinkedIn.call(this, job);
  }

  getApplications(filters = {}) {
    return this.appManager.listApplications(filters);
  }

  getStats() {
    return this.appManager.getStats();
  }

  getDailyReport(date) {
    return this.appManager.generateDailyReport(date);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default AutoApplier;

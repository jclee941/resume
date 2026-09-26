/**
 * Application Manager - 지원 현황 관리
 * 지원 이력 저장, 상태 추적, 통계
 */

import {
  createApplicationRecord,
  filterApplications,
  getActiveApplications as selectActiveApplications,
} from './application-manager/application-records.js';
import { expirePendingApplications } from './application-manager/cleanup.js';
import { generateDailyReport as buildDailyReport } from './application-manager/reports.js';
import {
  saveApplicationData,
  ensureDataDir,
  loadJsonFile,
  APPLICATIONS_FILE,
  STATS_FILE,
} from './application-manager/storage.js';
import {
  buildStats,
  calculateAverageResponseTime,
  calculateResponseRate,
  calculateSuccessRate,
  initStats,
  withCalculatedStats,
} from './application-manager/statistics.js';
import { APPLICATION_STATUS } from './application-manager/status.js';

export { APPLICATION_STATUS };

export class ApplicationManager {
  /**
   * @param {{ logger?: { error: (msg: string, ...args: unknown[]) => void, log?: (...args: unknown[]) => void } }} [options]
   */
  constructor({ logger = console } = {}) {
    this.logger = logger;
    this.ensureDataDir();
    /** @type {import('./application-manager/application-records.js').ApplicationRecord[]} */
    this.applications = this.loadApplications();
    this.stats = this.loadStats();
  }

  ensureDataDir() {
    ensureDataDir();
  }

  /**
   * @returns {import('./application-manager/application-records.js').ApplicationRecord[]}
   */
  loadApplications() {
    return /** @type {import('./application-manager/application-records.js').ApplicationRecord[]} */ (
      loadJsonFile(APPLICATIONS_FILE, () => [], this.logger, 'Failed to parse applications file:')
    );
  }

  /**
   * @returns {import('./application-manager/statistics.js').ApplicationStats}
   */
  loadStats() {
    return loadJsonFile(
      STATS_FILE,
      () => this.initStats(),
      this.logger,
      'Failed to parse stats file:'
    );
  }

  initStats() {
    return initStats();
  }

  save() {
    saveApplicationData(this.applications, this.stats);
  }

  /**
   * @param {import('./application-manager/application-records.js').JobInput} job
   * @param {import('./application-manager/application-records.js').CreateApplicationOptions} [options]
   * @returns {import('./application-manager/application-records.js').ApplicationRecord}
   */
  addApplication(job, options = {}) {
    const application = createApplicationRecord(job, options);

    this.applications.push(application);
    this.updateStats();
    this.save();

    return application;
  }

  /**
   * @param {string} applicationId
   * @param {string} newStatus
   * @param {string} [note]
   * @returns {{ success: boolean, error?: string, application?: import('./application-manager/application-records.js').ApplicationRecord }}
   */
  updateStatus(applicationId, newStatus, note = '') {
    const app = this.applications.find((application) => application.id === applicationId);
    if (!app) {
      return { success: false, error: 'Application not found' };
    }

    const oldStatus = app.status;
    app.status = newStatus;
    app.updatedAt = new Date().toISOString();

    if (newStatus === APPLICATION_STATUS.APPLIED && !app.appliedAt) {
      app.appliedAt = new Date().toISOString();
    }

    app.timeline.push(
      /** @type {import('./application-manager/application-records.js').ApplicationTimelineEntry} */ ({
        status: newStatus,
        previousStatus: oldStatus,
        timestamp: new Date().toISOString(),
        note,
      })
    );

    this.updateStats();
    this.save();

    return { success: true, application: app };
  }

  /**
   * @param {string} applicationId
   * @returns {import('./application-manager/application-records.js').ApplicationRecord | undefined}
   */
  getApplication(applicationId) {
    return this.applications.find((application) => application.id === applicationId);
  }

  /**
   * @param {import('./application-manager/application-records.js').ApplicationFilters} [filters]
   * @returns {import('./application-manager/application-records.js').ApplicationRecord[]}
   */
  listApplications(filters = {}) {
    return filterApplications(this.applications, filters);
  }

  getActiveApplications() {
    return selectActiveApplications(this.applications);
  }

  /**
   * @param {string} jobId
   * @returns {boolean}
   */
  isDuplicate(jobId) {
    return this.applications.some((application) => application.jobId === jobId);
  }

  updateStats() {
    this.stats = buildStats(this.applications);
  }

  getStats() {
    return withCalculatedStats(this.stats, this.applications);
  }

  calculateSuccessRate() {
    return calculateSuccessRate(this.applications);
  }

  calculateResponseRate() {
    return calculateResponseRate(this.applications);
  }

  calculateAverageResponseTime() {
    return calculateAverageResponseTime(this.applications);
  }

  generateDailyReport(date = new Date().toISOString().split('T')[0]) {
    return buildDailyReport(this.applications, this.stats, this.getActiveApplications(), date);
  }

  /**
   * @param {string} applicationId
   * @returns {{ success: boolean, error?: string }}
   */
  deleteApplication(applicationId) {
    const index = this.applications.findIndex((application) => application.id === applicationId);
    if (index === -1) {
      return { success: false, error: 'Application not found' };
    }

    this.applications.splice(index, 1);
    this.updateStats();
    this.save();

    return { success: true };
  }

  cleanupExpired() {
    const cleaned = expirePendingApplications(this.applications);

    if (cleaned > 0) {
      this.updateStats();
      this.save();
    }

    return { cleaned };
  }
}

export default ApplicationManager;

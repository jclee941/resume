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
  constructor({ logger = console } = {}) {
    this.logger = logger;
    this.ensureDataDir();
    this.applications = this.loadApplications();
    this.stats = this.loadStats();
  }

  ensureDataDir() {
    ensureDataDir();
  }

  loadApplications() {
    return loadJsonFile(
      APPLICATIONS_FILE,
      () => [],
      this.logger,
      'Failed to parse applications file:'
    );
  }

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

  addApplication(job, options = {}) {
    const application = createApplicationRecord(job, options);

    this.applications.push(application);
    this.updateStats();
    this.save();

    return application;
  }

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

    app.timeline.push({
      status: newStatus,
      previousStatus: oldStatus,
      timestamp: new Date().toISOString(),
      note,
    });

    this.updateStats();
    this.save();

    return { success: true, application: app };
  }

  getApplication(applicationId) {
    return this.applications.find((application) => application.id === applicationId);
  }

  listApplications(filters = {}) {
    return filterApplications(this.applications, filters);
  }

  getPendingApplications() {
    return this.listApplications({ status: APPLICATION_STATUS.PENDING });
  }

  getActiveApplications() {
    return selectActiveApplications(this.applications);
  }

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

import { ApplicationRepository } from '../../repositories/application-repository.js';
import * as lifecycle from './tracker-lifecycle.js';
import * as analytics from './tracker-analytics.js';
import { toIsoDate } from './tracker-normalizers.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_CONFIG = {
  enableTimeline: true,
  enableAnalytics: true,
};

export class ApplicationTrackerService {
  #repository;

  #coverLetterService;

  #logger;

  #config;

  constructor(dependencies = {}) {
    this.#repository = dependencies.applicationRepository ?? new ApplicationRepository();
    this.#coverLetterService = dependencies.coverLetterService ?? null;
    this.#logger = dependencies.logger ?? console;
    this.#config = {
      ...DEFAULT_CONFIG,
      ...dependencies,
    };
  }

  #getLifecycleContext() {
    return {
      repository: this.#repository,
      coverLetterService: this.#coverLetterService,
      logger: this.#logger,
      findByApplicationOrJobId: this.#findByApplicationOrJobId.bind(this),
      transitionStatus: this.#transitionStatus.bind(this),
    };
  }

  #getAnalyticsContext() {
    return {
      repository: this.#repository,
      enableAnalytics: this.#config.enableAnalytics,
      normalizeTimeRange: this.#normalizeTimeRange.bind(this),
      queryOne: this.#queryOne.bind(this),
    };
  }

  async startTracking(job, matchScore = 0) {
    return lifecycle.startTracking(this.#getLifecycleContext(), job, matchScore);
  }

  async recordSearch(jobs = [], stats = {}) {
    return lifecycle.recordSearch(this.#getLifecycleContext(), jobs, stats);
  }

  async recordScoring(jobId, score, type = 'rule') {
    return lifecycle.recordScoring(this.#getLifecycleContext(), jobId, score, type);
  }

  async recordCoverLetter(jobId, coverLetter) {
    return lifecycle.recordCoverLetter(this.#getLifecycleContext(), jobId, coverLetter);
  }

  async recordSubmission(jobId, result = {}) {
    return lifecycle.recordSubmission(this.#getLifecycleContext(), jobId, result);
  }

  async recordApprovalRequest(jobId) {
    return lifecycle.recordApprovalRequest(this.#getLifecycleContext(), jobId);
  }

  async recordApproval(jobId, approved, reviewer = 'system') {
    return lifecycle.recordApproval(this.#getLifecycleContext(), jobId, approved, reviewer);
  }

  async recordCompletion(jobId, status = 'completed', notes = '') {
    return lifecycle.recordCompletion(this.#getLifecycleContext(), jobId, status, notes);
  }

  async getApplication(id) {
    const application = await this.#findByApplicationOrJobId(id);
    const timeline = this.#config.enableTimeline ? await this.#getTimeline(application.id) : [];

    return {
      ...application,
      timeline,
    };
  }

  async getStats(timeRange = {}) {
    return analytics.getStats(this.#getAnalyticsContext(), timeRange);
  }

  async getDailyStats(date = new Date()) {
    return analytics.getDailyStats(this.#getAnalyticsContext(), date);
  }

  async getWeeklyStats() {
    return analytics.getWeeklyStats(this.#getAnalyticsContext());
  }

  async getSuccessRate() {
    return analytics.getSuccessRate(this.#getAnalyticsContext());
  }

  async getAverageMatchScore() {
    return analytics.getAverageMatchScore(this.#getAnalyticsContext());
  }

  async getTopCompanies(limit = 10) {
    return analytics.getTopCompanies(this.#getAnalyticsContext(), limit);
  }

  async getPlatformBreakdown() {
    return analytics.getPlatformBreakdown(this.#getAnalyticsContext());
  }

  async #findByApplicationOrJobId(id) {
    if (!id) {
      throw new Error('Application identifier is required');
    }

    const byId = await this.#repository.findById(String(id));
    if (byId) return byId;

    const byJobId = await this.#repository.findByJobId(String(id));
    if (byJobId.length > 0) {
      return byJobId[0];
    }

    throw new Error(`Application not found for identifier: ${id}`);
  }

  async #transitionStatus(applicationId, status, note = '') {
    if (!this.#config.enableTimeline) {
      return this.#repository.update(applicationId, {
        notes: note,
      });
    }

    return this.#repository.updateStatus(applicationId, status, note);
  }

  async #getTimeline(applicationId) {
    return this.#repository.d1Client.query(
      `
        SELECT id, application_id, status, previous_status, note, timestamp
        FROM application_timeline
        WHERE application_id = ?
        ORDER BY timestamp ASC, id ASC
      `,
      [applicationId]
    );
  }

  #normalizeTimeRange(timeRange = {}) {
    if (typeof timeRange === 'string') {
      if (timeRange === '7d') {
        const to = new Date();
        const from = new Date(to.getTime() - 6 * ONE_DAY_MS);
        return {
          from: toIsoDate(from),
          to: toIsoDate(to),
        };
      }

      if (timeRange === '30d') {
        const to = new Date();
        const from = new Date(to.getTime() - 29 * ONE_DAY_MS);
        return {
          from: toIsoDate(from),
          to: toIsoDate(to),
        };
      }
    }

    const to = toIsoDate(timeRange.to);
    const from = toIsoDate(timeRange.from ?? new Date(new Date(to).getTime() - 6 * ONE_DAY_MS));
    return { from, to };
  }

  async #queryOne(query, params = []) {
    const rows = await this.#repository.d1Client.query(query, params);
    return rows?.[0] || null;
  }
}

export default ApplicationTrackerService;

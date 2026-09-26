import { ApplicationRepository } from '../../repositories/application-repository.js';
import * as lifecycle from './tracker-lifecycle.js';
import * as analytics from './tracker-analytics.js';
import { toIsoDate } from './tracker-normalizers.js';

/**
 * @typedef {import('./tracker-lifecycle.js').RawTrackerJob} RawTrackerJob
 * @typedef {import('./tracker-lifecycle.js').ApplicationEntity} ApplicationEntity
 * @typedef {import('./tracker-lifecycle.js').ApplicationRepositoryLike} ApplicationRepositoryLike
 * @typedef {import('./tracker-lifecycle.js').CoverLetterServiceLike} CoverLetterServiceLike
 * @typedef {{ warn(message: string, meta?: Record<string, unknown>): void }} TrackerLogger
 * @typedef {import('./tracker-analytics.js').TrackerAnalyticsContext} TrackerAnalyticsContext
 * @typedef {import('./tracker-analytics.js').TrackerRepository} TrackerRepository
 *
 * @typedef {ApplicationRepositoryLike & TrackerRepository & {
 *   findById(id: string): Promise<ApplicationEntity | null>;
 *   findByJobId(jobId: string): Promise<ApplicationEntity[]>;
 *   updateStatus(id: string, status: string, note?: string): Promise<ApplicationEntity>;
 *   d1Client: { query(sql: string, params?: unknown[]): Promise<Array<Record<string, unknown>>> };
 * }} TrackerRepositoryService
 *
 * @typedef {{
 *   applicationRepository?: TrackerRepositoryService;
 *   coverLetterService?: CoverLetterServiceLike | null;
 *   logger?: TrackerLogger;
 *   enableTimeline?: boolean;
 *   enableAnalytics?: boolean;
 * }} TrackerDependencies
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_CONFIG = {
  enableTimeline: true,
  enableAnalytics: true,
};

export class ApplicationTrackerService {
  /** @type {TrackerRepositoryService} */
  #repository;

  /** @type {CoverLetterServiceLike | null} */
  #coverLetterService;

  /** @type {TrackerLogger} */
  #logger;

  /** @type {{ enableTimeline: boolean, enableAnalytics: boolean }} */
  #config;

  /**
   * @param {TrackerDependencies} [dependencies]
   */
  constructor(dependencies = {}) {
    this.#repository = /** @type {TrackerRepositoryService} */ (
      dependencies.applicationRepository ?? new ApplicationRepository()
    );
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

  /**
   * @returns {TrackerAnalyticsContext}
   */
  #getAnalyticsContext() {
    return {
      repository: this.#repository,
      enableAnalytics: this.#config.enableAnalytics,
      normalizeTimeRange: this.#normalizeTimeRange.bind(this),
      queryOne: this.#queryOne.bind(this),
    };
  }

  /**
   * @param {RawTrackerJob} job
   * @param {number} [matchScore]
   * @returns {Promise<ApplicationEntity>}
   */
  async startTracking(job, matchScore = 0) {
    return lifecycle.startTracking(this.#getLifecycleContext(), job, matchScore);
  }

  /**
   * @param {RawTrackerJob[]} [jobs]
   * @param {Record<string, unknown>} [stats]
   */
  async recordSearch(jobs = [], stats = {}) {
    return lifecycle.recordSearch(this.#getLifecycleContext(), jobs, stats);
  }

  /**
   * @param {string | number} jobId
   * @param {number} score
   * @param {string} [type]
   */
  async recordScoring(jobId, score, type = 'rule') {
    return lifecycle.recordScoring(this.#getLifecycleContext(), jobId, score, type);
  }

  /**
   * @param {string | number} jobId
   * @param {string | Record<string, unknown>} coverLetter
   */
  async recordCoverLetter(jobId, coverLetter) {
    return lifecycle.recordCoverLetter(this.#getLifecycleContext(), jobId, coverLetter);
  }

  /**
   * @param {string | number} jobId
   * @param {Record<string, unknown>} [result]
   */
  async recordSubmission(jobId, result = {}) {
    return lifecycle.recordSubmission(this.#getLifecycleContext(), jobId, result);
  }

  /**
   * @param {string | number} jobId
   */
  async recordApprovalRequest(jobId) {
    return lifecycle.recordApprovalRequest(this.#getLifecycleContext(), jobId);
  }

  /**
   * @param {string | number} jobId
   * @param {boolean} approved
   * @param {string} [reviewer]
   */
  async recordApproval(jobId, approved, reviewer = 'system') {
    return lifecycle.recordApproval(this.#getLifecycleContext(), jobId, approved, reviewer);
  }

  /**
   * @param {string | number} jobId
   * @param {string} [status]
   * @param {string} [notes]
   */
  async recordCompletion(jobId, status = 'completed', notes = '') {
    return lifecycle.recordCompletion(this.#getLifecycleContext(), jobId, status, notes);
  }

  /**
   * @param {string | number} id
   */
  async getApplication(id) {
    const application = await this.#findByApplicationOrJobId(id);
    const timeline = this.#config.enableTimeline ? await this.#getTimeline(application.id) : [];

    return {
      ...application,
      timeline,
    };
  }

  /**
   * @param {unknown} [timeRange]
   */
  async getStats(timeRange = {}) {
    return analytics.getStats(this.#getAnalyticsContext(), timeRange);
  }

  /**
   * @param {Date | string} [date]
   */
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

  /**
   * @param {number} [limit]
   */
  async getTopCompanies(limit = 10) {
    return analytics.getTopCompanies(this.#getAnalyticsContext(), limit);
  }

  async getPlatformBreakdown() {
    return analytics.getPlatformBreakdown(this.#getAnalyticsContext());
  }

  /**
   * @param {string | number} id
   * @returns {Promise<ApplicationEntity>}
   */
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

  /**
   * @param {string} applicationId
   * @param {string} status
   * @param {string} [note]
   */
  async #transitionStatus(applicationId, status, note = '') {
    if (!this.#config.enableTimeline) {
      return this.#repository.update(applicationId, {
        notes: note,
      });
    }

    return this.#repository.updateStatus(applicationId, status, note);
  }

  /**
   * @param {string} applicationId
   */
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

  /**
   * @param {unknown} [timeRange]
   * @returns {{ from: string, to: string }}
   */
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

    const to = toIsoDate(/** @type {{ to?: unknown }} */ (timeRange).to);
    const from = toIsoDate(
      /** @type {{ from?: unknown }} */ (timeRange).from ??
        new Date(new Date(to).getTime() - 6 * ONE_DAY_MS)
    );
    return { from, to };
  }

  /**
   * @param {string} query
   * @param {unknown[]} [params]
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async #queryOne(query, params = []) {
    const rows = await this.#repository.d1Client.query(query, params);
    return rows?.[0] || null;
  }
}

export default ApplicationTrackerService;

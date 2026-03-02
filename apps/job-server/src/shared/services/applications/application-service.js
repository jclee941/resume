/**
 * Framework-agnostic Application Service
 * Extracts business logic from server/routes/applications.js and dashboard/routes/applications.js
 */
import { ApplicationManager } from '../../../auto-apply/application-manager.js';

/**
 * @typedef {Object} ListOptions
 * @property {string} [status]
 * @property {string} [source]
 * @property {string} [company]
 * @property {string} [sortBy='createdAt']
 * @property {string} [sortOrder='desc']
 * @property {number} [limit=100]
 * @property {number} [offset=0]
 * @property {string} [fromDate]
 */

/**
 * @typedef {Object} ApplicationResult
 * @property {boolean} success
 * @property {Object} [application]
 * @property {Array} [applications]
 * @property {number} [total]
 * @property {string} [error]
 * @property {number} [statusCode]
 */

export class ApplicationService {
  /** @type {ApplicationManager} */
  #manager;

  /**
   * @param {ApplicationManager} [manager]
   */
  constructor(manager) {
    this.#manager = manager || new ApplicationManager();
  }

  /**
   * List applications with filters
   * @param {ListOptions} options
   * @returns {ApplicationResult}
   */
  list(options = {}) {
    const {
      status,
      source,
      company,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 100,
      offset = 0,
      fromDate,
    } = options;

    const apps = this.#manager.listApplications({
      status,
      source,
      company,
      sortBy,
      sortOrder,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      fromDate,
    });

    return {
      success: true,
      applications: apps,
      total: apps.length,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    };
  }

  /**
   * Get single application by ID
   * @param {string} id
   * @returns {ApplicationResult}
   */
  get(id) {
    const app = this.#manager.getApplication(id);
    if (!app) {
      return {
        success: false,
        error: 'Application not found',
        statusCode: 404,
      };
    }
    return { success: true, application: app };
  }

  /**
   * Create new application
   * @param {Object} job
   * @param {Object} [options]
   * @returns {ApplicationResult}
   */
  create(job, options) {
    const app = this.#manager.addApplication(job, options);
    return { success: true, application: app, statusCode: 201 };
  }

  /**
   * Update application metadata
   * @param {string} id
   * @param {Object} updates - { notes, priority, resumeId }
   * @returns {ApplicationResult}
   */
  update(id, updates) {
    const app = this.#manager.getApplication(id);
    if (!app) {
      return {
        success: false,
        error: 'Application not found',
        statusCode: 404,
      };
    }

    const { notes, priority, resumeId } = updates;
    if (notes !== undefined) app.notes = notes;
    if (priority !== undefined) app.priority = priority;
    if (resumeId !== undefined) app.resumeId = resumeId;
    app.updatedAt = new Date().toISOString();

    this.#manager.save();
    return { success: true, application: app };
  }

  /**
   * Update application status
   * @param {string} id
   * @param {string} status
   * @param {string} [note]
   * @returns {ApplicationResult}
   */
  updateStatus(id, status, note) {
    const result = this.#manager.updateStatus(id, status, note);
    return {
      ...result,
      statusCode: result.success ? 200 : 400,
    };
  }

  /**
   * Delete application
   * @param {string} id
   * @returns {ApplicationResult}
   */
  delete(id) {
    const result = this.#manager.deleteApplication(id);
    return {
      ...result,
      statusCode: result.success ? 200 : 404,
    };
  }

  /**
   * Cleanup expired applications
   * @returns {Object}
   */
  cleanup() {
    return this.#manager.cleanupExpired();
  }

  /**
   * Get underlying manager (for stats/reports that need direct access)
   * @returns {ApplicationManager}
   */
  getManager() {
    return this.#manager;
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create ApplicationService singleton
 * @param {ApplicationManager} [manager]
 * @returns {ApplicationService}
 */
export function getApplicationService(manager) {
  if (!instance) {
    instance = new ApplicationService(manager);
  }
  return instance;
}

export default ApplicationService;

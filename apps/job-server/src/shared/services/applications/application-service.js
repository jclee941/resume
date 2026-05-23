/**
 * Framework-agnostic Application Service
 * Extracts business logic from server/routes/applications.js and dashboard/routes/applications.js
 */

/** @typedef {import('@resume/types').ListOptions} ListOptions */
/** @typedef {import('@resume/types').ApplicationResult} ApplicationResult */
/** @typedef {import('@resume/types').ApplicationManagerPort} ApplicationManagerPort */
/** @typedef {import('@resume/types').ApplicationServiceDependencies} ApplicationServiceDependencies */

export class ApplicationService {
  /** @type {ApplicationManagerPort} */
  #manager;

  /**
   * @param {ApplicationServiceDependencies} dependencies
   */
  constructor(dependencies) {
    if (!dependencies?.manager) {
      throw new TypeError('ApplicationService requires a manager dependency');
    }
    this.#manager = dependencies.manager;
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
   * @returns {ApplicationManagerPort}
   */
  getManager() {
    return this.#manager;
  }
}

/**
 * Create an isolated ApplicationService instance for constructor-injected dependencies.
 * @param {ApplicationServiceDependencies} dependencies
 * @returns {ApplicationService}
 */
export function createApplicationService(dependencies) {
  return new ApplicationService(dependencies);
}

export default ApplicationService;

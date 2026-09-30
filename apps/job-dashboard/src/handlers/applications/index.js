import { ApplicationRepository } from './application-repository.js';
import { ApprovalRequestRepository } from './approval-request-repository.js';
import { cleanupExpiredApplications } from './cleanup-operation.js';
import { createApplication } from './create-operation.js';
import { deleteApplication } from './delete-operation.js';
import { getApplication } from './detail-query.js';
import { listApplications } from './list-query.js';
import { jsonResponse } from '../../middleware/cors.js';
import { updateApplicationStatus } from './status-operation.js';
import { updateApplication } from './update-operation.js';
import { decideWorkflowApprovals } from './workflow-approval-operation.js';

export { APPLICATION_STATUS, VALID_STATUSES } from './statuses.js';

export class ApplicationsHandler {
  /**
   * @param {import('./application-repository.js').ApplicationDb} db
   * @param {import('../auth.js').AuthHandler | null} [auth]
   * @param {{ fetcher?: typeof fetch }} [options]
   */
  constructor(db, auth = null, options = {}) {
    this.db = db;
    this.auth = auth;
    this.fetcher = options.fetcher || fetch;
    /** @type {ApplicationRepository & { countAll(): Promise<number> }} */
    this.repository = /** @type {ApplicationRepository & { countAll(): Promise<number> }} */ (
      new ApplicationRepository(db)
    );
    this.approvalRequests = new ApprovalRequestRepository(db);
  }

  /**
   * @param {unknown} data
   * @param {number} [status]
   * @returns {Response}
   */
  jsonResponse(data, status = 200) {
    return jsonResponse(data, status);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async list(request) {
    return listApplications(this, request);
  }

  /**
   * @param {import('../../router.js').RouterRequest} request
   * @returns {Promise<Response>}
   */
  async get(request) {
    return getApplication(this, request);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async create(request) {
    return createApplication(this, request);
  }

  /**
   * @param {import('../../router.js').RouterRequest} request
   * @returns {Promise<Response>}
   */
  async update(request) {
    return updateApplication(this, request);
  }

  /**
   * @param {import('../../router.js').RouterRequest} request
   * @returns {Promise<Response>}
   */
  async updateStatus(request) {
    return updateApplicationStatus(this, request);
  }

  /**
   * @param {import('../../router.js').RouterRequest} request
   * @returns {Promise<Response>}
   */
  async delete(request) {
    return deleteApplication(this, request);
  }

  /**
   * @param {Request} [_request]
   * @returns {Promise<Response>}
   */
  async cleanupExpired(_request) {
    return cleanupExpiredApplications(this);
  }

  /**
   * @param {import('../../router.js').RouterRequest} request
   * @param {string} decision
   * @returns {Promise<Response>}
   */
  async decideWorkflowApprovals(request, decision) {
    return decideWorkflowApprovals(this, request, decision);
  }
}

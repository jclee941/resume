import { ApplicationRepository } from './application-repository.js';
import { cleanupExpiredApplications } from './cleanup-operation.js';
import { createApplication } from './create-operation.js';
import { deleteApplication } from './delete-operation.js';
import { getApplication } from './detail-query.js';
import { listApplications } from './list-query.js';
import { jsonResponse } from './responses.js';
import { updateApplicationStatus } from './status-operation.js';
import { updateApplication } from './update-operation.js';
import { syncWantedApplications } from './wanted-sync-operation.js';
import { WantedHistoryRepository } from './wanted-history-repository.js';

export { APPLICATION_STATUS, VALID_STATUSES } from './statuses.js';

export class ApplicationsHandler {
  constructor(db, auth = null, options = {}) {
    this.db = db;
    this.auth = auth;
    this.fetcher = options.fetcher || fetch;
    this.repository = new ApplicationRepository(db);
    this.wantedHistoryRepository = new WantedHistoryRepository(db);
  }

  jsonResponse(data, status = 200) {
    return jsonResponse(data, status);
  }

  async list(request) {
    return listApplications(this, request);
  }

  async get(request) {
    return getApplication(this, request);
  }

  async create(request) {
    return createApplication(this, request);
  }

  async update(request) {
    return updateApplication(this, request);
  }

  async updateStatus(request) {
    return updateApplicationStatus(this, request);
  }

  async delete(request) {
    return deleteApplication(this, request);
  }

  async cleanupExpired(_request) {
    return cleanupExpiredApplications(this);
  }

  async syncWantedHistory(request) {
    return syncWantedApplications(this, request);
  }
}

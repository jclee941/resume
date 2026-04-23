import { D1Client } from '../clients/d1/index.js';
import {
  findById,
  findByJobId,
  findByStatus,
  findPendingApprovals,
  findTodayApplications,
  getApplicationStats,
} from './application-reader.js';
import {
  createApplication,
  updateApplication,
  updateApplicationStatus,
} from './application-writer.js';

export class ApplicationRepository {
  /**
   * @param {D1Client} [d1Client]
   */
  constructor(d1Client = new D1Client()) {
    this.d1Client = d1Client;
  }

  /**
   * Insert a new application row.
   * @param {Record<string, unknown>} application
   * @returns {Promise<Record<string, unknown>>}
   */
  async create(application) {
    return await createApplication(this.d1Client, application);
  }

  /**
   * Get application by ID.
   * @param {string} id
   * @returns {Promise<Record<string, unknown>|null>}
   */
  async findById(id) {
    return await findById(this.d1Client, id);
  }

  /**
   * Get applications by job ID.
   * @param {string} jobId
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findByJobId(jobId) {
    return await findByJobId(this.d1Client, jobId);
  }

  /**
   * List applications by status with pagination.
   * @param {string} status
   * @param {{limit?: number, offset?: number, sortBy?: string, order?: 'asc'|'desc'|'ASC'|'DESC'}} [options]
   * @returns {Promise<{items: Record<string, unknown>[], total: number, limit: number, offset: number}>}
   */
  async findByStatus(status, options = {}) {
    return await findByStatus(this.d1Client, status, options);
  }

  /**
   * Update application fields by ID.
   * @param {string} id
   * @param {Record<string, unknown>} updates
   * @returns {Promise<Record<string, unknown>>}
   */
  async update(id, updates) {
    return await updateApplication(this.d1Client, id, updates);
  }

  /**
   * Update status and append timeline history.
   * @param {string} id
   * @param {string} status
   * @param {string} [note='']
   * @returns {Promise<Record<string, unknown>>}
   */
  async updateStatus(id, status, note = '') {
    return await updateApplicationStatus(this.d1Client, id, status, note);
  }

  /**
   * Get applications awaiting manual approval (score 60-74).
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findPendingApprovals() {
    return await findPendingApprovals(this.d1Client);
  }

  /**
   * Get applications created today.
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findTodayApplications() {
    return await findTodayApplications(this.d1Client);
  }

  /**
   * Aggregate application statistics.
   * @returns {Promise<{total:number,today:number,pendingApprovals:number,averageMatchScore:number,byStatus:Record<string, number>,bySource:Record<string, number>}>}
   */
  async getStats() {
    return await getApplicationStats(this.d1Client);
  }
}

export default ApplicationRepository;

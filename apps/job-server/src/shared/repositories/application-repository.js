import { randomUUID } from 'node:crypto';
import { D1Client } from '../clients/d1/index.js';
import { AppError, ErrorCodes, ExternalServiceError, ValidationError } from '../errors/index.js';

const STATUS_UPDATE_TIMESTAMPS = {
  applied: 'applied_at',
  approved: 'approved_at',
  rejected: 'rejected_at',
};

const SORTABLE_STATUS_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'match_score',
  'status',
  'priority',
  'company',
]);

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
    const now = new Date().toISOString();
    const payload = this.#normalizeCreateInput(application, now);

    try {
      await this.d1Client.query(
        `
          INSERT INTO applications (
            id, job_id, source, source_url, position, company, location,
            match_score, status, priority, resume_id, cover_letter, notes,
            created_at, updated_at, applied_at, workflow_id, approved_at, rejected_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.id,
          payload.job_id,
          payload.source,
          payload.source_url,
          payload.position,
          payload.company,
          payload.location,
          payload.match_score,
          payload.status,
          payload.priority,
          payload.resume_id,
          payload.cover_letter,
          payload.notes,
          payload.created_at,
          payload.updated_at,
          payload.applied_at,
          payload.workflow_id,
          payload.approved_at,
          payload.rejected_at,
        ]
      );

      await this.d1Client.query(
        `
          INSERT INTO application_timeline
            (application_id, status, previous_status, note, timestamp)
          VALUES (?, ?, NULL, ?, ?)
        `,
        [payload.id, payload.status, 'Application created', now]
      );

      const created = await this.findById(payload.id);
      if (!created) {
        throw new AppError(
          'Application created but could not be fetched',
          ErrorCodes.UNKNOWN,
          500,
          { id: payload.id }
        );
      }

      return created;
    } catch (error) {
      this.#throwD1Error('create', error, { id: payload.id });
    }
  }

  /**
   * Get application by ID.
   * @param {string} id
   * @returns {Promise<Record<string, unknown>|null>}
   */
  async findById(id) {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('id is required', {
        fields: ['id'],
        code: ErrorCodes.VALIDATION,
      });
    }

    try {
      const rows = await this.d1Client.query('SELECT * FROM applications WHERE id = ? LIMIT 1', [
        id,
      ]);

      return rows[0] || null;
    } catch (error) {
      this.#throwD1Error('findById', error, { id });
    }
  }

  /**
   * Get applications by job ID.
   * @param {string} jobId
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findByJobId(jobId) {
    if (!jobId || typeof jobId !== 'string') {
      throw new ValidationError('jobId is required', {
        fields: ['jobId'],
        code: ErrorCodes.VALIDATION,
      });
    }

    try {
      return await this.d1Client.query(
        'SELECT * FROM applications WHERE job_id = ? ORDER BY created_at DESC',
        [jobId]
      );
    } catch (error) {
      this.#throwD1Error('findByJobId', error, { jobId });
    }
  }

  /**
   * List applications by status with pagination.
   * @param {string} status
   * @param {{limit?: number, offset?: number, sortBy?: string, order?: 'asc'|'desc'|'ASC'|'DESC'}} [options]
   * @returns {Promise<{items: Record<string, unknown>[], total: number, limit: number, offset: number}>}
   */
  async findByStatus(status, options = {}) {
    if (!status || typeof status !== 'string') {
      throw new ValidationError('status is required', {
        fields: ['status'],
        code: ErrorCodes.VALIDATION,
      });
    }

    const limit = Number.isFinite(options.limit) ? Number(options.limit) : 50;
    const offset = Number.isFinite(options.offset) ? Number(options.offset) : 0;
    const sortBy =
      options.sortBy && SORTABLE_STATUS_COLUMNS.has(options.sortBy) ? options.sortBy : 'created_at';
    const order = String(options.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    try {
      const [items, totalRows] = await Promise.all([
        this.d1Client.query(
          `
            SELECT *
            FROM applications
            WHERE status = ?
            ORDER BY ${sortBy} ${order}
            LIMIT ? OFFSET ?
          `,
          [status, limit, offset]
        ),
        this.d1Client.query('SELECT COUNT(*) AS total FROM applications WHERE status = ?', [
          status,
        ]),
      ]);

      return {
        items,
        total: Number(totalRows[0]?.total || 0),
        limit,
        offset,
      };
    } catch (error) {
      this.#throwD1Error('findByStatus', error, { status, limit, offset });
    }
  }

  /**
   * Update application fields by ID.
   * @param {string} id
   * @param {Record<string, unknown>} updates
   * @returns {Promise<Record<string, unknown>>}
   */
  async update(id, updates) {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('id is required', {
        fields: ['id'],
        code: ErrorCodes.VALIDATION,
      });
    }

    if (!updates || typeof updates !== 'object') {
      throw new ValidationError('updates object is required', {
        fields: ['updates'],
      });
    }

    const current = await this.findById(id);
    if (!current) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404, { id });
    }

    const allowed = {
      job_id: updates.job_id,
      source: updates.source,
      source_url: updates.source_url,
      position: updates.position,
      company: updates.company,
      location: updates.location,
      match_score: updates.match_score,
      priority: updates.priority,
      resume_id: updates.resume_id,
      cover_letter: updates.cover_letter,
      notes: updates.notes,
      applied_at: updates.applied_at,
      workflow_id: updates.workflow_id,
      approved_at: updates.approved_at,
      rejected_at: updates.rejected_at,
    };

    const entries = Object.entries(allowed).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      throw new ValidationError('No updatable fields provided', {
        fields: Object.keys(allowed),
      });
    }

    const setClauses = entries.map(([key]) => `${key} = ?`);
    const params = entries.map(([, value]) => value);
    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString(), id);

    try {
      await this.d1Client.query(
        `UPDATE applications SET ${setClauses.join(', ')} WHERE id = ?`,
        params
      );

      const updated = await this.findById(id);
      if (!updated) {
        throw new AppError(
          'Application update completed but record was not found',
          ErrorCodes.UNKNOWN,
          500,
          { id }
        );
      }

      return updated;
    } catch (error) {
      this.#throwD1Error('update', error, { id });
    }
  }

  /**
   * Update status and append timeline history.
   * @param {string} id
   * @param {string} status
   * @param {string} [note='']
   * @returns {Promise<Record<string, unknown>>}
   */
  async updateStatus(id, status, note = '') {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('id is required', {
        fields: ['id'],
      });
    }

    if (!status || typeof status !== 'string') {
      throw new ValidationError('status is required', {
        fields: ['status'],
      });
    }

    const current = await this.findById(id);
    if (!current) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404, { id });
    }

    const now = new Date().toISOString();
    const statusColumn = STATUS_UPDATE_TIMESTAMPS[status] || null;

    let sql = 'UPDATE applications SET status = ?, updated_at = ?';
    const params = [status, now];

    if (statusColumn) {
      sql += `, ${statusColumn} = ?`;
      params.push(now);
    }

    if (status === 'applied' && !current.applied_at) {
      sql += ', applied_at = ?';
      params.push(now);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    try {
      await this.d1Client.query(sql, params);
      await this.d1Client.query(
        `
          INSERT INTO application_timeline
            (application_id, status, previous_status, note, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `,
        [id, status, current.status, note || null, now]
      );

      const updated = await this.findById(id);
      if (!updated) {
        throw new AppError(
          'Status updated but could not fetch application',
          ErrorCodes.UNKNOWN,
          500,
          {
            id,
            status,
          }
        );
      }

      return updated;
    } catch (error) {
      this.#throwD1Error('updateStatus', error, { id, status });
    }
  }

  /**
   * Get applications awaiting manual approval (score 60-74).
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findPendingApprovals() {
    try {
      return await this.d1Client.query(
        `
          SELECT *
          FROM applications
          WHERE status = 'pending'
            AND match_score BETWEEN 60 AND 74
          ORDER BY match_score DESC, created_at DESC
        `
      );
    } catch (error) {
      this.#throwD1Error('findPendingApprovals', error);
    }
  }

  /**
   * Get applications created today.
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findTodayApplications() {
    try {
      return await this.d1Client.query(
        `
          SELECT *
          FROM applications
          WHERE date(created_at) = date('now')
          ORDER BY created_at DESC
        `
      );
    } catch (error) {
      this.#throwD1Error('findTodayApplications', error);
    }
  }

  /**
   * Aggregate application statistics.
   * @returns {Promise<{total:number,today:number,pendingApprovals:number,averageMatchScore:number,byStatus:Record<string, number>,bySource:Record<string, number>}>}
   */
  async getStats() {
    try {
      const [summaryRows, statusRows, sourceRows] = await Promise.all([
        this.d1Client.query(
          `
            SELECT
              COUNT(*) AS total,
              SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) AS today,
              SUM(CASE WHEN status = 'pending' AND match_score BETWEEN 60 AND 74 THEN 1 ELSE 0 END) AS pendingApprovals,
              AVG(COALESCE(match_score, 0)) AS averageMatchScore
            FROM applications
          `
        ),
        this.d1Client.query(
          `
            SELECT status, COUNT(*) AS count
            FROM applications
            GROUP BY status
          `
        ),
        this.d1Client.query(
          `
            SELECT source, COUNT(*) AS count
            FROM applications
            GROUP BY source
          `
        ),
      ]);

      const byStatus = {};
      for (const row of statusRows) {
        byStatus[row.status] = Number(row.count || 0);
      }

      const bySource = {};
      for (const row of sourceRows) {
        bySource[row.source] = Number(row.count || 0);
      }

      return {
        total: Number(summaryRows[0]?.total || 0),
        today: Number(summaryRows[0]?.today || 0),
        pendingApprovals: Number(summaryRows[0]?.pendingApprovals || 0),
        averageMatchScore: Number(summaryRows[0]?.averageMatchScore || 0),
        byStatus,
        bySource,
      };
    } catch (error) {
      this.#throwD1Error('getStats', error);
    }
  }

  #normalizeCreateInput(application, now) {
    if (!application || typeof application !== 'object') {
      throw new ValidationError('application payload is required', {
        fields: ['application'],
      });
    }

    const source = application.source || null;
    const position = application.position || null;
    const company = application.company || null;

    if (!source || !position || !company) {
      throw new ValidationError('source, position, and company are required', {
        fields: ['source', 'position', 'company'],
      });
    }

    const id = application.id || randomUUID();

    return {
      id,
      job_id: application.job_id || null,
      source,
      source_url: application.source_url || null,
      position,
      company,
      location: application.location || null,
      match_score: Number.isFinite(application.match_score) ? Number(application.match_score) : 0,
      status: application.status || 'pending',
      priority: application.priority || 'medium',
      resume_id: application.resume_id || null,
      cover_letter: application.cover_letter || null,
      notes: application.notes || null,
      created_at: application.created_at || now,
      updated_at: application.updated_at || now,
      applied_at: application.applied_at || null,
      workflow_id: application.workflow_id || null,
      approved_at: application.approved_at || null,
      rejected_at: application.rejected_at || null,
    };
  }

  #throwD1Error(operation, error, metadata = {}) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new ExternalServiceError(`D1 operation failed: ${operation}`, {
      service: 'd1',
      code: ErrorCodes.EXTERNAL_API_ERROR,
      statusCode: 502,
      metadata,
      cause: error,
    });
  }
}

export default ApplicationRepository;

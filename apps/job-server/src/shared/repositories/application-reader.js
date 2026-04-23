import { AppError, ErrorCodes, ValidationError } from '../errors/index.js';
import { SORTABLE_STATUS_COLUMNS, throwD1Error } from './helpers/application-normalizer.js';

/**
 * @param {{query: Function}} d1Client
 * @param {string} id
 * @returns {Promise<Record<string, unknown>|null>}
 */
export async function findById(d1Client, id) {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('id is required', {
      fields: ['id'],
      code: ErrorCodes.VALIDATION,
    });
  }

  try {
    const rows = await d1Client.query('SELECT * FROM applications WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  } catch (error) {
    throwD1Error('findById', error, { id });
  }
}

/**
 * @param {{query: Function}} d1Client
 * @param {string} jobId
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function findByJobId(d1Client, jobId) {
  if (!jobId || typeof jobId !== 'string') {
    throw new ValidationError('jobId is required', {
      fields: ['jobId'],
      code: ErrorCodes.VALIDATION,
    });
  }

  try {
    return await d1Client.query('SELECT * FROM applications WHERE job_id = ? ORDER BY created_at DESC', [
      jobId,
    ]);
  } catch (error) {
    throwD1Error('findByJobId', error, { jobId });
  }
}

/**
 * @param {{query: Function}} d1Client
 * @param {string} status
 * @param {{limit?: number, offset?: number, sortBy?: string, order?: 'asc'|'desc'|'ASC'|'DESC'}} [options]
 * @returns {Promise<{items: Record<string, unknown>[], total: number, limit: number, offset: number}>}
 */
export async function findByStatus(d1Client, status, options = {}) {
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
      d1Client.query(
        `
          SELECT *
          FROM applications
          WHERE status = ?
          ORDER BY ${sortBy} ${order}
          LIMIT ? OFFSET ?
        `,
        [status, limit, offset]
      ),
      d1Client.query('SELECT COUNT(*) AS total FROM applications WHERE status = ?', [status]),
    ]);

    return {
      items,
      total: Number(totalRows[0]?.total || 0),
      limit,
      offset,
    };
  } catch (error) {
    throwD1Error('findByStatus', error, { status, limit, offset });
  }
}

/**
 * @param {{query: Function}} d1Client
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function findPendingApprovals(d1Client) {
  try {
    return await d1Client.query(
      `
        SELECT *
        FROM applications
        WHERE status = 'pending'
          AND match_score BETWEEN 60 AND 74
        ORDER BY match_score DESC, created_at DESC
      `
    );
  } catch (error) {
    throwD1Error('findPendingApprovals', error);
  }
}

/**
 * @param {{query: Function}} d1Client
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function findTodayApplications(d1Client) {
  try {
    return await d1Client.query(
      `
        SELECT *
        FROM applications
        WHERE date(created_at) = date('now')
        ORDER BY created_at DESC
      `
    );
  } catch (error) {
    throwD1Error('findTodayApplications', error);
  }
}

/**
 * @param {{query: Function}} d1Client
 * @returns {Promise<{total:number,today:number,pendingApprovals:number,averageMatchScore:number,byStatus:Record<string, number>,bySource:Record<string, number>}>}
 */
export async function getApplicationStats(d1Client) {
  try {
    const [summaryRows, statusRows, sourceRows] = await Promise.all([
      d1Client.query(
        `
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) AS today,
            SUM(CASE WHEN status = 'pending' AND match_score BETWEEN 60 AND 74 THEN 1 ELSE 0 END) AS pendingApprovals,
            AVG(COALESCE(match_score, 0)) AS averageMatchScore
          FROM applications
        `
      ),
      d1Client.query(
        `
          SELECT status, COUNT(*) AS count
          FROM applications
          GROUP BY status
        `
      ),
      d1Client.query(
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
    throwD1Error('getStats', error);
  }
}

/**
 * @param {{query: Function}} d1Client
 * @param {string} id
 * @returns {Promise<Record<string, unknown>>}
 */
export async function requireById(d1Client, id) {
  const current = await findById(d1Client, id);
  if (!current) {
    throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404, { id });
  }

  return current;
}

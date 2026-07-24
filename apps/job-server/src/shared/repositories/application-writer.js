import { AppError, ErrorCodes, ValidationError } from '../errors/index.js';
import { findById, requireById } from './application-reader.js';
import {
  STATUS_UPDATE_TIMESTAMPS,
  normalizeCreateInput,
  throwD1Error,
} from './helpers/application-normalizer.js';
/**
 * @param {{query: Function}} d1Client
 * @param {Record<string, unknown>} application
 * @returns {Promise<Record<string, unknown>>}
 */
export async function createApplication(d1Client, application) {
  const now = new Date().toISOString();
  const payload = normalizeCreateInput(application, now);
  try {
    await d1Client.query(
      `
        INSERT INTO applications (
          id, job_id, source, source_url, canonical_url, position, company, location,
          match_score, status, priority, resume_id, cover_letter, notes,
          created_at, updated_at, applied_at, workflow_id, approved_at, rejected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.id,
        payload.job_id,
        payload.source,
        payload.source_url,
        payload.canonical_url,
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

    await d1Client.query(
      `
        INSERT INTO application_timeline
          (application_id, status, previous_status, note, timestamp)
        VALUES (?, ?, NULL, ?, ?)
      `,
      [payload.id, payload.status, 'Application created', now]
    );

    const created = await findById(d1Client, payload.id);
    if (!created) {
      throw new AppError('Application created but could not be fetched', ErrorCodes.UNKNOWN, 500, {
        id: payload.id,
      });
    }

    return created;
  } catch (error) {
    throwD1Error('create', error, { id: payload.id });
  }
}

/**
 * @param {{query: Function}} d1Client
 * @param {string} id
 * @param {string} status
 * @param {string} [note='']
 * @returns {Promise<Record<string, unknown>>}
 */
export async function updateApplicationStatus(d1Client, id, status, note = '') {
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

  const current = await requireById(d1Client, id);
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
    await d1Client.query(sql, params);
    await d1Client.query(
      `
        INSERT INTO application_timeline
          (application_id, status, previous_status, note, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `,
      [id, status, current.status, note || null, now]
    );

    const updated = await findById(d1Client, id);
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
    throwD1Error('updateStatus', error, { id, status });
  }
}

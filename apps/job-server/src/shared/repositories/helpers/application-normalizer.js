import { randomUUID } from 'node:crypto';

import { canonicalizeJobUrl } from '@resume/shared/job-url-canonicalization';
import { AppError, ErrorCodes, ExternalServiceError, ValidationError } from '../../errors/index.js';

export const STATUS_UPDATE_TIMESTAMPS = {
  applied: 'applied_at',
  approved: 'approved_at',
  rejected: 'rejected_at',
};

export const SORTABLE_STATUS_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'match_score',
  'status',
  'priority',
  'company',
]);

/**
 * @typedef {{
 *   id?: string | null;
 *   job_id?: string | null;
 *   source?: string | null;
 *   source_url?: string | null;
 *   position?: string | null;
 *   company?: string | null;
 *   location?: string | null;
 *   match_score?: number | null;
 *   status?: string | null;
 *   priority?: string | null;
 *   resume_id?: string | null;
 *   cover_letter?: string | null;
 *   notes?: string | null;
 *   created_at?: string | null;
 *   updated_at?: string | null;
 *   applied_at?: string | null;
 *   workflow_id?: string | null;
 *   approved_at?: string | null;
 *   rejected_at?: string | null;
 *   [key: string]: unknown;
 * }} ApplicationCreateInput
 */

/**
 * @typedef {{
 *   id: string;
 *   job_id: unknown;
 *   source: unknown;
 *   source_url: string | null;
 *   canonical_url: string | null;
 *   position: unknown;
 *   company: unknown;
 *   location: unknown;
 *   match_score: number;
 *   status: unknown;
 *   priority: unknown;
 *   resume_id: unknown;
 *   cover_letter: unknown;
 *   notes: unknown;
 *   created_at: unknown;
 *   updated_at: unknown;
 *   applied_at: unknown;
 *   workflow_id: unknown;
 *   approved_at: unknown;
 *   rejected_at: unknown;
 * }} NormalizedApplicationRecord
 */

/**
 * @param {ApplicationCreateInput} application
 * @param {string} now
 * @returns {NormalizedApplicationRecord}
 */
export function normalizeCreateInput(application, now) {
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

  const sourceUrl = application.source_url || null;

  return {
    id,
    job_id: application.job_id || null,
    source,
    source_url: sourceUrl,
    canonical_url: canonicalizeJobUrl(sourceUrl),
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

/**
 * @param {string} operation
 * @param {unknown} error
 * @param {Record<string, unknown>} [metadata]
 * @returns {never}
 */
export function throwD1Error(operation, error, metadata = {}) {
  if (error instanceof AppError) {
    throw error;
  }

  throw new ExternalServiceError(`D1 operation failed: ${operation}`, {
    service: 'd1',
    code: ErrorCodes.EXTERNAL_API_ERROR,
    statusCode: 502,
    metadata,
    cause: /** @type {Error | null} */ (error),
  });
}

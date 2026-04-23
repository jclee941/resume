import { randomUUID } from 'node:crypto';

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

export function throwD1Error(operation, error, metadata = {}) {
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

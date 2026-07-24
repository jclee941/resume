import { canonicalizeJobUrl } from '@resume/shared/job-url-canonicalization';
import { AppError, ErrorCodes, ValidationError } from '../errors/index.js';
import { findById, requireById } from './application-reader.js';
import { throwD1Error } from './helpers/application-normalizer.js';

export async function updateApplication(d1Client, id, updates) {
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

  await requireById(d1Client, id);
  const allowed = {
    job_id: updates.job_id,
    source: updates.source,
    source_url: updates.source_url,
    canonical_url:
      updates.source_url === undefined ? undefined : canonicalizeJobUrl(updates.source_url),
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
    await d1Client.query(`UPDATE applications SET ${setClauses.join(', ')} WHERE id = ?`, params);

    const updated = await findById(d1Client, id);
    if (!updated) {
      throw new AppError(
        'Application update completed but record was not found',
        ErrorCodes.UNKNOWN,
        500,
        {
          id,
        }
      );
    }

    return updated;
  } catch (error) {
    throwD1Error('update', error, { id });
  }
}

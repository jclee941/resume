import { validateApplicationCreate } from '../../utils/validators.js';
import { APPLICATION_STATUS, VALID_STATUSES } from './statuses.js';

function normalizeNewApplication(body) {
  const job = body.job || body;
  const options = body.options || {};
  const statusCandidate = body.status || job.status || options.status;
  const matchScoreRaw =
    job.matchScore ?? job.match_score ?? job.matchPercentage ?? job.match_percentage ?? 0;

  return {
    job,
    options,
    source: job.source || job.platform || 'manual',
    sourceUrl:
      job.sourceUrl ||
      job.source_url ||
      job.jobUrl ||
      job.job_url ||
      body.sourceUrl ||
      body.source_url ||
      body.jobUrl ||
      body.job_url ||
      null,
    notes: job.notes ?? options.notes ?? '',
    status: VALID_STATUSES.includes(statusCandidate) ? statusCandidate : APPLICATION_STATUS.SAVED,
    matchScore: Math.max(0, Math.min(100, parseInt(matchScoreRaw) || 0)),
  };
}

export async function createApplication(handler, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return handler.jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const validation = validateApplicationCreate(body);
  if (!validation.valid) {
    return handler.jsonResponse({ error: 'Validation failed', details: validation.errors }, 400);
  }

  const data = normalizeNewApplication(body);
  const id = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await handler.db
    .prepare(
      `
      INSERT INTO applications (id, job_id, source, source_url, position, company, location, match_score, status, priority, resume_id, cover_letter, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .bind(
      id,
      data.job.id || null,
      data.source,
      data.sourceUrl,
      data.job.position || data.job.title || 'Unknown',
      data.job.company || 'Unknown',
      data.job.location || null,
      data.matchScore,
      data.status,
      data.job.priority || data.options.priority || 'medium',
      data.options.resumeId || null,
      data.options.coverLetter || null,
      data.notes,
      now,
      now
    )
    .run();

  await handler.db
    .prepare(
      `
      INSERT INTO application_timeline (application_id, status, note, timestamp)
      VALUES (?, ?, ?, ?)
    `
    )
    .bind(id, data.status, 'Application created', now)
    .run();

  const app = await handler.db.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();
  return handler.jsonResponse(app, 201);
}

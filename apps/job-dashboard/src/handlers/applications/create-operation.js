import { validateApplicationCreate } from '@resume/shared/validation';
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

  await handler.repository.insert({
    id,
    jobId: data.job.id || null,
    source: data.source,
    sourceUrl: data.sourceUrl,
    position: data.job.position || data.job.title || 'Unknown',
    company: data.job.company || 'Unknown',
    location: data.job.location || null,
    matchScore: data.matchScore,
    status: data.status,
    priority: data.job.priority || data.options.priority || 'medium',
    resumeId: data.options.resumeId || null,
    coverLetter: data.options.coverLetter || null,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  });

  await handler.repository.insertTimeline({
    applicationId: id,
    status: data.status,
    note: 'Application created',
    timestamp: now,
  });

  const app = await handler.repository.findById(id);
  return handler.jsonResponse(app, 201);
}

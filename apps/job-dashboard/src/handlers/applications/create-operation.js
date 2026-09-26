import { validateApplicationCreate } from '@resume/shared/validation';
import { canonicalizeJobUrl } from '../../job-url-canonicalization.js';
import { APPLICATION_STATUS, VALID_STATUSES } from './statuses.js';

/**
 * @typedef {{
 *   id?: string;
 *   position?: string;
 *   title?: string;
 *   company?: string;
 *   location?: string | null;
 *   matchScore?: number | string;
 *   match_score?: number | string;
 *   matchPercentage?: number | string;
 *   match_percentage?: number | string;
 *   source?: string;
 *   platform?: string;
 *   sourceUrl?: string;
 *   source_url?: string;
 *   jobUrl?: string;
 *   job_url?: string;
 *   priority?: string;
 *   notes?: string;
 *   status?: string;
 *   [key: string]: unknown;
 * }} JobPayload
 *
 * @typedef {{
 *   priority?: string;
 *   resumeId?: string | null;
 *   coverLetter?: string | null;
 *   notes?: string;
 *   status?: string;
 *   [key: string]: unknown;
 * }} OptionsPayload
 *
 * @typedef {{
 *   job?: JobPayload;
 *   options?: OptionsPayload;
 *   status?: string;
 *   sourceUrl?: string;
 *   source_url?: string;
 *   jobUrl?: string;
 *   job_url?: string;
 *   [key: string]: unknown;
 * } & JobPayload} ApplicationCreateBody
 *
 * @typedef {{
 *   repository: {
 *     insert(app: Record<string, unknown>): Promise<unknown>;
 *     insertTimeline(event: import('./application-repository.js').ApplicationTimelineEvent): Promise<void>;
 *     findById(id: string): Promise<Record<string, unknown> | null>;
 *   };
 *   jsonResponse(data: unknown, status?: number): Response;
 * }} CreateHandler
 */

/**
 * @param {ApplicationCreateBody} body
 */
function normalizeNewApplication(body) {
  const job = body.job || body;
  const options = body.options || {};
  const statusCandidate = body.status || job.status || options.status;
  const matchScoreRaw =
    job.matchScore ?? job.match_score ?? job.matchPercentage ?? job.match_percentage ?? 0;

  const sourceUrl =
    job.sourceUrl ||
    job.source_url ||
    job.jobUrl ||
    job.job_url ||
    body.sourceUrl ||
    body.source_url ||
    body.jobUrl ||
    body.job_url ||
    null;

  return {
    job,
    options,
    source: job.source || job.platform || 'manual',
    sourceUrl,
    canonicalUrl: canonicalizeJobUrl(sourceUrl),
    notes: job.notes ?? options.notes ?? '',
    status: VALID_STATUSES.includes(/** @type {string} */ (statusCandidate))
      ? /** @type {string} */ (statusCandidate)
      : APPLICATION_STATUS.SAVED,
    matchScore: Math.max(0, Math.min(100, parseInt(String(matchScoreRaw)) || 0)),
  };
}

/**
 * @param {CreateHandler} handler
 * @param {Request | { json(): Promise<unknown> }} request
 * @returns {Promise<Response>}
 */
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

  const data = normalizeNewApplication(/** @type {ApplicationCreateBody} */ (body));
  const id = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await handler.repository.insert({
    id,
    jobId: data.job.id || null,
    source: data.source,
    sourceUrl: data.sourceUrl,
    canonicalUrl: data.canonicalUrl,
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

import { validateStatusUpdate } from '@resume/shared/validation';
import { APPLICATION_STATUS } from './statuses.js';

/**
 * @typedef {{
 *   repository: {
 *     findById(id: string): Promise<Record<string, unknown> | null>;
 *     updateStatus(id: string, options: import('./application-repository.js').UpdateStatusOptions): Promise<unknown>;
 *     insertTimeline(event: import('./application-repository.js').ApplicationTimelineEvent): Promise<void>;
 *   };
 *   jsonResponse(data: unknown, status?: number): Response;
 * }} StatusHandler
 *
 * @typedef {{
 *   params: { id: string };
 *   json(): Promise<unknown>;
 * }} StatusRequest
 *
 * @typedef {{
 *   status: string;
 *   note?: string;
 * }} StatusUpdateBody
 */

/**
 * @param {StatusHandler} handler
 * @param {StatusRequest} request
 * @returns {Promise<Response>}
 */
export async function updateApplicationStatus(handler, request) {
  const { id } = request.params;

  let body;
  try {
    body = await request.json();
  } catch {
    return handler.jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const validation = validateStatusUpdate(body);
  if (!validation.valid) {
    return handler.jsonResponse({ error: 'Validation failed', details: validation.errors }, 400);
  }

  const { status, note = '' } = /** @type {StatusUpdateBody} */ (body);
  const now = new Date().toISOString();
  const app = await handler.repository.findById(id);
  if (!app) {
    return handler.jsonResponse({ success: false, error: 'Application not found' }, 404);
  }

  const oldStatus = /** @type {string} */ (app.status);
  const appliedAt = status === APPLICATION_STATUS.APPLIED && !app.applied_at ? now : null;

  await handler.repository.updateStatus(id, { status, updatedAt: now, appliedAt });

  await handler.repository.insertTimeline({
    applicationId: id,
    status,
    previousStatus: oldStatus,
    note,
    timestamp: now,
  });

  const updated = await handler.repository.findById(id);
  return handler.jsonResponse({ success: true, application: updated });
}

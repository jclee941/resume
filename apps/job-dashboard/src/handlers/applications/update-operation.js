import { validateApplicationUpdate } from '@resume/shared/validation';

/**
 * @typedef {{
 *   notes?: string;
 *   priority?: string;
 *   resumeId?: string;
 * }} ApplicationUpdateBody
 *
 * @typedef {{
 *   repository: {
 *     findById(id: string): Promise<Record<string, unknown> | null>;
 *     update(
 *       id: string,
 *       updates: { notes?: string; priority?: string; resumeId?: string },
 *       now: string
 *     ): Promise<unknown>;
 *   };
 *   jsonResponse(data: unknown, status?: number): Response;
 * }} UpdateHandler
 *
 * @typedef {{
 *   params: { id: string };
 *   json(): Promise<unknown>;
 * }} UpdateRequest
 */

/**
 * @param {UpdateHandler} handler
 * @param {UpdateRequest} request
 * @returns {Promise<Response>}
 */
export async function updateApplication(handler, request) {
  const { id } = request.params;

  /** @type {ApplicationUpdateBody} */
  let body;
  try {
    body = /** @type {ApplicationUpdateBody} */ (await request.json());
  } catch {
    return handler.jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const validation = validateApplicationUpdate(body);
  if (!validation.valid) {
    return handler.jsonResponse({ error: 'Validation failed', details: validation.errors }, 400);
  }

  const now = new Date().toISOString();
  const app = await handler.repository.findById(id);
  if (!app) {
    return handler.jsonResponse({ error: 'Application not found' }, 404);
  }

  const updated = await handler.repository.update(
    id,
    {
      notes: body.notes,
      priority: body.priority,
      resumeId: body.resumeId,
    },
    now
  );

  return handler.jsonResponse({ success: true, application: updated });
}

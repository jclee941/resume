/**
 * @typedef {{
 *   repository: {
 *     findById(id: string): Promise<Record<string, unknown> | null>;
 *     findTimelineByAppId(applicationId: string): Promise<unknown[]>;
 *   };
 *   jsonResponse(data: unknown, status?: number): Response;
 * }} DetailQueryHandler
 */

/**
 * @param {DetailQueryHandler} handler
 * @param {{ params: { id: string } }} request
 * @returns {Promise<Response>}
 */
export async function getApplication(handler, request) {
  const { id } = request.params;
  const app = await handler.repository.findById(id);
  if (!app) {
    return handler.jsonResponse({ error: 'Application not found' }, 404);
  }

  const timeline = await handler.repository.findTimelineByAppId(id);
  return handler.jsonResponse({ ...app, timeline });
}

/**
 * @typedef {{
 *   repository: {
 *     findById(id: string): Promise<Record<string, unknown> | null>;
 *     delete(id: string): Promise<unknown>;
 *   };
 *   jsonResponse(data: unknown, status?: number): Response;
 * }} DeleteHandler
 */

/**
 * @param {DeleteHandler} handler
 * @param {{ params: { id: string } }} request
 * @returns {Promise<Response>}
 */
export async function deleteApplication(handler, request) {
  const { id } = request.params;
  const app = await handler.repository.findById(id);
  if (!app) {
    return handler.jsonResponse({ success: false, error: 'Application not found' }, 404);
  }

  await handler.repository.delete(id);
  return handler.jsonResponse({ success: true });
}

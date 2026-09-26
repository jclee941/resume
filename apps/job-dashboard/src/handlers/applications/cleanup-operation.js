/**
 * @typedef {{
 *   repository: { cleanupExpired(cutoffDate: string): Promise<number> };
 *   jsonResponse(data: unknown, status?: number): Response;
 * }} CleanupHandler
 */

/**
 * @param {CleanupHandler} handler
 * @returns {Promise<Response>}
 */
export async function cleanupExpiredApplications(handler) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const cleaned = await handler.repository.cleanupExpired(thirtyDaysAgo);
  return handler.jsonResponse({ cleaned });
}

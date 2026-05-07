export async function cleanupExpiredApplications(handler) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const cleaned = await handler.repository.cleanupExpired(thirtyDaysAgo);
  return handler.jsonResponse({ cleaned });
}

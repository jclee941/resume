export async function cleanupExpiredApplications(handler) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const result = await handler.db
    .prepare(
      `
      UPDATE applications 
      SET status = 'expired', updated_at = ?
      WHERE status = 'pending' AND created_at < ?
    `
    )
    .bind(now.toISOString(), thirtyDaysAgo)
    .run();

  return handler.jsonResponse({ cleaned: result.meta?.changes || 0 });
}

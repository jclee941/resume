export async function getApplication(handler, request) {
  const { id } = request.params;
  const app = await handler.db.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();

  if (!app) {
    return handler.jsonResponse({ error: 'Application not found' }, 404);
  }

  const timeline = await handler.db
    .prepare('SELECT * FROM application_timeline WHERE application_id = ? ORDER BY timestamp DESC')
    .bind(id)
    .all();

  return handler.jsonResponse({ ...app, timeline: timeline.results });
}

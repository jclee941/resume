export async function deleteApplication(handler, request) {
  const { id } = request.params;

  const app = await handler.db.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();
  if (!app) {
    return handler.jsonResponse({ success: false, error: 'Application not found' }, 404);
  }

  await handler.db
    .prepare('DELETE FROM application_timeline WHERE application_id = ?')
    .bind(id)
    .run();
  await handler.db.prepare('DELETE FROM applications WHERE id = ?').bind(id).run();

  return handler.jsonResponse({ success: true });
}

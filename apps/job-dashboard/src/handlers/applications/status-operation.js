import { validateStatusUpdate } from '../../utils/validators.js';
import { APPLICATION_STATUS } from './statuses.js';

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

  const { status, note = '' } = body;
  const now = new Date().toISOString();
  const app = await handler.db.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();
  if (!app) {
    return handler.jsonResponse({ success: false, error: 'Application not found' }, 404);
  }

  const oldStatus = app.status;
  let updateSql = 'UPDATE applications SET status = ?, updated_at = ?';
  const params = [status, now];

  if (status === APPLICATION_STATUS.APPLIED && !app.applied_at) {
    updateSql += ', applied_at = ?';
    params.push(now);
  }

  updateSql += ' WHERE id = ?';
  params.push(id);

  await handler.db
    .prepare(updateSql)
    .bind(...params)
    .run();

  await handler.db
    .prepare(
      `
      INSERT INTO application_timeline (application_id, status, previous_status, note, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `
    )
    .bind(id, status, oldStatus, note, now)
    .run();

  const updated = await handler.db
    .prepare('SELECT * FROM applications WHERE id = ?')
    .bind(id)
    .first();
  return handler.jsonResponse({ success: true, application: updated });
}

import { validateApplicationUpdate } from '../../utils/validators.js';

export async function updateApplication(handler, request) {
  const { id } = request.params;

  let body;
  try {
    body = await request.json();
  } catch {
    return handler.jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const validation = validateApplicationUpdate(body);
  if (!validation.valid) {
    return handler.jsonResponse({ error: 'Validation failed', details: validation.errors }, 400);
  }

  const now = new Date().toISOString();
  const app = await handler.db.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();
  if (!app) {
    return handler.jsonResponse({ error: 'Application not found' }, 404);
  }

  const updates = [];
  const params = [];

  if (body.notes !== undefined) {
    updates.push('notes = ?');
    params.push(body.notes);
  }
  if (body.priority !== undefined) {
    updates.push('priority = ?');
    params.push(body.priority);
  }
  if (body.resumeId !== undefined) {
    updates.push('resume_id = ?');
    params.push(body.resumeId);
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    params.push(now, id);

    await handler.db
      .prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();
  }

  const updated = await handler.db
    .prepare('SELECT * FROM applications WHERE id = ?')
    .bind(id)
    .first();
  return handler.jsonResponse({ success: true, application: updated });
}

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
  const app = await handler.repository.findById(id);
  if (!app) {
    return handler.jsonResponse({ success: false, error: 'Application not found' }, 404);
  }

  const oldStatus = app.status;
  const appliedAt = status === APPLICATION_STATUS.APPLIED && !app.applied_at ? now : null;

  await handler.repository.updateStatus(id, { status, updatedAt: now, appliedAt });

  await handler.repository.insertTimeline({
    applicationId: id,
    status,
    previousStatus: oldStatus,
    note,
    timestamp: now,
  });

  const updated = await handler.repository.findById(id);
  return handler.jsonResponse({ success: true, application: updated });
}

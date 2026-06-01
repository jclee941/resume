import { validateApplicationUpdate } from '@resume/shared/validation';

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
  const app = await handler.repository.findById(id);
  if (!app) {
    return handler.jsonResponse({ error: 'Application not found' }, 404);
  }

  const updated = await handler.repository.update(
    id,
    {
      notes: body.notes,
      priority: body.priority,
      resumeId: body.resumeId,
    },
    now
  );

  return handler.jsonResponse({ success: true, application: updated });
}

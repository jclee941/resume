export async function getApplication(handler, request) {
  const { id } = request.params;
  const app = await handler.repository.findById(id);
  if (!app) {
    return handler.jsonResponse({ error: 'Application not found' }, 404);
  }

  const timeline = await handler.repository.findTimelineByAppId(id);
  return handler.jsonResponse({ ...app, timeline });
}

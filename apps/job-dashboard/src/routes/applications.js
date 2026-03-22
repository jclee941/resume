export function registerApplicationsRoutes(router, ctx) {
  const { apps } = ctx;

  router.get('/api/applications', (req) => apps.list(req));
  router.post('/api/applications', (req) => apps.create(req));
  router.get('/api/applications/:id', (req) => apps.get(req));
  router.put('/api/applications/:id', (req) => apps.update(req));
  router.delete('/api/applications/:id', (req) => apps.delete(req));
  router.put('/api/applications/:id/status', (req) => apps.updateStatus(req));

  router.post('/api/cleanup', (req) => apps.cleanupExpired(req));
}

/**
 * @typedef {Object} ApplicationsHandlerShape
 * @property {import('../router.js').RouteHandler} list
 * @property {import('../router.js').RouteHandler} create
 * @property {import('../router.js').RouteHandler} get
 * @property {import('../router.js').RouteHandler} update
 * @property {import('../router.js').RouteHandler} delete
 * @property {import('../router.js').RouteHandler} updateStatus
 * @property {import('../router.js').RouteHandler} cleanupExpired
 */

/**
 * @typedef {Object} RouterShape
 * @property {(path: string, handler: import('../router.js').RouteHandler) => void} get
 * @property {(path: string, handler: import('../router.js').RouteHandler) => void} post
 * @property {(path: string, handler: import('../router.js').RouteHandler) => void} put
 * @property {(path: string, handler: import('../router.js').RouteHandler) => void} delete
 */

/**
 * @param {RouterShape} router
 * @param {{ apps: ApplicationsHandlerShape }} ctx
 */
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

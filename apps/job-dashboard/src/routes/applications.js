/**
 * @typedef {Object} ApplicationsHandlerShape
 * @property {(req: Request) => Promise<Response> | Response} list
 * @property {(req: Request) => Promise<Response> | Response} create
 * @property {(req: Request) => Promise<Response> | Response} syncWantedHistory
 * @property {(req: Request) => Promise<Response> | Response} get
 * @property {(req: Request) => Promise<Response> | Response} update
 * @property {(req: Request) => Promise<Response> | Response} delete
 * @property {(req: Request) => Promise<Response> | Response} updateStatus
 * @property {(req: Request) => Promise<Response> | Response} cleanupExpired
 */

/**
 * @typedef {Object} RouterShape
 * @property {(path: string, handler: (req: Request) => Promise<Response> | Response) => void} get
 * @property {(path: string, handler: (req: Request) => Promise<Response> | Response) => void} post
 * @property {(path: string, handler: (req: Request) => Promise<Response> | Response) => void} put
 * @property {(path: string, handler: (req: Request) => Promise<Response> | Response) => void} delete
 */

/**
 * @param {RouterShape} router
 * @param {{ apps: ApplicationsHandlerShape }} ctx
 */
export function registerApplicationsRoutes(router, ctx) {
  const { apps } = ctx;

  router.get('/api/applications', (/** @type {Request} */ req) => apps.list(req));
  router.post('/api/applications', (/** @type {Request} */ req) => apps.create(req));
  router.post('/api/applications/sync/wanted', (/** @type {Request} */ req) =>
    apps.syncWantedHistory(req)
  );
  router.get('/api/applications/:id', (/** @type {Request} */ req) => apps.get(req));
  router.put('/api/applications/:id', (/** @type {Request} */ req) => apps.update(req));
  router.delete('/api/applications/:id', (/** @type {Request} */ req) => apps.delete(req));
  router.put('/api/applications/:id/status', (/** @type {Request} */ req) =>
    apps.updateStatus(req)
  );

  router.post('/api/cleanup', (/** @type {Request} */ req) => apps.cleanupExpired(req));
}

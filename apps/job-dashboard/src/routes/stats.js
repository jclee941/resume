/**
 * @typedef {Object} StatsHandlerShape
 * @property {(req: Request) => Promise<Response> | Response} getStats
 * @property {(req: Request) => Promise<Response> | Response} getWeeklyStats
 * @property {(req: Request) => Promise<Response> | Response} getDailyReport
 * @property {(req: Request) => Promise<Response> | Response} getWeeklyReport
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
 * @param {{ stats: StatsHandlerShape }} ctx
 */
export function registerStatsRoutes(router, ctx) {
  const { stats } = ctx;

  router.get('/api/stats', (/** @type {Request} */ req) => stats.getStats(req));
  router.get('/api/stats/weekly', (/** @type {Request} */ req) => stats.getWeeklyStats(req));
  router.get('/api/report', (/** @type {Request} */ req) => stats.getDailyReport(req));
  router.get('/api/report/weekly', (/** @type {Request} */ req) => stats.getWeeklyReport(req));
}

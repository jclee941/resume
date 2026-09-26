/**
 * @typedef {Object} StatsHandlerShape
 * @property {import('../router.js').RouteHandler} getStats
 * @property {import('../router.js').RouteHandler} getWeeklyStats
 * @property {import('../router.js').RouteHandler} getDailyReport
 * @property {import('../router.js').RouteHandler} getWeeklyReport
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
 * @param {{ stats: StatsHandlerShape }} ctx
 */
export function registerStatsRoutes(router, ctx) {
  const { stats } = ctx;

  router.get('/api/stats', (req) => stats.getStats(req));
  router.get('/api/stats/weekly', (req) => stats.getWeeklyStats(req));
  router.get('/api/report', (req) => stats.getDailyReport(req));
  router.get('/api/report/weekly', (req) => stats.getWeeklyReport(req));
}

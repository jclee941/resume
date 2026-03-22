export function registerStatsRoutes(router, ctx) {
  const { stats } = ctx;

  router.get('/api/stats', (req) => stats.getStats(req));
  router.get('/api/stats/weekly', (req) => stats.getWeeklyStats(req));
  router.get('/api/report', (req) => stats.getDailyReport(req));
  router.get('/api/report/weekly', (req) => stats.getWeeklyReport(req));
}

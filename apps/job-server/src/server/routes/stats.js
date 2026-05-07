export default async function statsRoutes(fastify) {
  fastify.get('/stats', async () => {
    return fastify.statsService.getStats();
  });

  fastify.get('/stats/weekly', async () => {
    return fastify.statsService.getWeeklyReport();
  });

  fastify.get('/report', async (request) => {
    const { date } = request.query;
    return fastify.statsService.getDailyReport(date);
  });

  fastify.get('/report/weekly', async () => {
    return fastify.statsService.getWeeklyReport();
  });

  fastify.post('/cleanup', async () => {
    return fastify.applicationService.cleanup();
  });
}

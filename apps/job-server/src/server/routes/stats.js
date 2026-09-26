/**
 * @typedef {{
 *   getStats(): unknown;
 *   getWeeklyReport(): unknown;
 *   getDailyReport(date?: string): unknown;
 * }} StatsService
 */

/**
 * @typedef {{
 *   cleanup(): unknown;
 * }} ApplicationService
 */

/**
 * @typedef {import('fastify').FastifyInstance & {
 *   statsService: StatsService;
 *   applicationService: ApplicationService;
 * }} StatsFastifyInstance
 */

/**
 * @param {StatsFastifyInstance} fastify
 */
export default async function statsRoutes(fastify) {
  fastify.get('/stats', async () => {
    return fastify.statsService.getStats();
  });

  fastify.get('/stats/weekly', async () => {
    return fastify.statsService.getWeeklyReport();
  });

  fastify.get(
    '/report',
    async (
      /** @type {import('fastify').FastifyRequest<{ Querystring: { date?: string } }>} */ request
    ) => {
      const { date } = request.query;
      return fastify.statsService.getDailyReport(date);
    }
  );

  fastify.get('/report/weekly', async () => {
    return fastify.statsService.getWeeklyReport();
  });

  fastify.post('/cleanup', async () => {
    return fastify.applicationService.cleanup();
  });
}

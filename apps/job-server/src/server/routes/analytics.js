/**
 * @typedef {{
 *   generateReport(): Promise<unknown>;
 *   getSuccessRateBySource(): Promise<unknown>;
 *   getSuccessRateByMatchScore(): Promise<unknown>;
 *   getWeeklyTrend(weeks: number): Promise<unknown>;
 *   getTopPerformingCompanies(limit: number): Promise<unknown>;
 *   getPositionTypeAnalysis(): Promise<unknown>;
 * }} ApplicationAnalytics
 */

/**
 * @typedef {import('fastify').FastifyInstance & {
 *   applicationAnalytics: ApplicationAnalytics;
 * }} AnalyticsFastifyInstance
 */

/**
 * @param {AnalyticsFastifyInstance} fastify
 */
export default async function analyticsRoutes(fastify) {
  const analytics = fastify.applicationAnalytics;

  fastify.get('/api/analytics/report', async (_request, _reply) => {
    const report = await analytics.generateReport();
    return report;
  });

  fastify.get('/api/analytics/success-rate/source', async (_request, _reply) => {
    const data = await analytics.getSuccessRateBySource();
    return { data };
  });

  fastify.get('/api/analytics/success-rate/score', async (_request, _reply) => {
    const data = await analytics.getSuccessRateByMatchScore();
    return { data };
  });

  fastify.get(
    '/api/analytics/trend/weekly',
    /**
     * @param {import('fastify').FastifyRequest<{ Querystring: { weeks: string } }>} request
     * @param {import('fastify').FastifyReply} _reply
     */
    async (request, _reply) => {
      const weeks = parseInt(request.query.weeks) || 8;
      const data = await analytics.getWeeklyTrend(weeks);
      return { data };
    }
  );

  fastify.get(
    '/api/analytics/companies/top',
    /**
     * @param {import('fastify').FastifyRequest<{ Querystring: { limit: string } }>} request
     * @param {import('fastify').FastifyReply} _reply
     */
    async (request, _reply) => {
      const limit = parseInt(request.query.limit) || 10;
      const data = await analytics.getTopPerformingCompanies(limit);
      return { data };
    }
  );

  fastify.get('/api/analytics/position-types', async (_request, _reply) => {
    const data = await analytics.getPositionTypeAnalysis();
    return { data };
  });
}

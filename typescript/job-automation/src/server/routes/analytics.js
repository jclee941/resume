import { ApplicationAnalytics } from '../../shared/services/analytics/index.js';

export default async function analyticsRoutes(fastify) {
  const analytics = new ApplicationAnalytics(fastify.applicationService);

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

  fastify.get('/api/analytics/trend/weekly', async (request, _reply) => {
    const weeks = parseInt(request.query.weeks) || 8;
    const data = await analytics.getWeeklyTrend(weeks);
    return { data };
  });

  fastify.get('/api/analytics/companies/top', async (request, _reply) => {
    const limit = parseInt(request.query.limit) || 10;
    const data = await analytics.getTopPerformingCompanies(limit);
    return { data };
  });

  fastify.get('/api/analytics/position-types', async (_request, _reply) => {
    const data = await analytics.getPositionTypeAnalysis();
    return { data };
  });
}

import { getApplicationService } from '../../shared/services/applications/application-service.js';
import { getStatsService } from '../../shared/services/stats/stats-service.js';

const appService = getApplicationService();
const statsService = getStatsService(appService);

export default async function statsRoutes(fastify) {
  fastify.get('/stats', async () => {
    return statsService.getStats();
  });

  fastify.get('/stats/weekly', async () => {
    return statsService.getWeeklyReport();
  });

  fastify.get('/report', async (request) => {
    const { date } = request.query;
    return statsService.getDailyReport(date);
  });

  fastify.get('/report/weekly', async () => {
    return statsService.getWeeklyReport();
  });

  fastify.post('/cleanup', async () => {
    return appService.cleanup();
  });
}

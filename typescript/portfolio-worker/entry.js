import portfolioWorker from './worker.js';
import jobHandler, {
  JobCrawlingWorkflow,
  ApplicationWorkflow,
  ResumeSyncWorkflow,
  DailyReportWorkflow,
  HealthCheckWorkflow,
  BackupWorkflow,
  CleanupWorkflow,
} from '../job-automation/workers/src/index.js';

export {
  JobCrawlingWorkflow,
  ApplicationWorkflow,
  ResumeSyncWorkflow,
  DailyReportWorkflow,
  HealthCheckWorkflow,
  BackupWorkflow,
  CleanupWorkflow,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith('/job')) {
        return jobHandler.fetch(request, env, ctx);
      }

      return portfolioWorker.fetch(request, env, ctx);
    } catch (error) {
      console.error('[entry] Unhandled error:', error?.message || error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  async scheduled(event, env, ctx) {
    try {
      return jobHandler.scheduled(event, env, ctx);
    } catch (error) {
      console.error('[entry] Scheduled handler error:', error?.message || error);
    }
  },
};

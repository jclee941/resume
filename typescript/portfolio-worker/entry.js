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

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://resume.jclee.me/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://resume.jclee.me/job/dashboard</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

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
      if (url.pathname === '/sitemap.xml') {
        return new Response(SITEMAP_XML, {
          headers: {
            'Content-Type': 'application/xml; charset=UTF-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

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

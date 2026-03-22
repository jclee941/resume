import { jsonResponse } from '../middleware/cors.js';

export function registerWorkflowRoutes(router, ctx) {
  const { env } = ctx;

  router.post('/api/workflows/job-crawling', async (req) => {
    const body = await req.json().catch(() => ({}));
    const instance = await env.JOB_CRAWLING_WORKFLOW.create({ params: body });
    return jsonResponse({ instanceId: instance.id, status: 'started' });
  });

  router.post('/api/workflows/application', async (req) => {
    const body = await req.json().catch(() => ({}));
    const instance = await env.APPLICATION_WORKFLOW.create({ params: body });
    return jsonResponse({ instanceId: instance.id, status: 'started' });
  });

  router.post('/api/workflows/resume-sync', async (req) => {
    const body = await req.json().catch(() => ({}));
    const instance = await env.RESUME_SYNC_WORKFLOW.create({ params: body });
    return jsonResponse({ instanceId: instance.id, status: 'started' });
  });

  router.post('/api/workflows/daily-report', async (req) => {
    const body = await req.json().catch(() => ({}));
    const instance = await env.DAILY_REPORT_WORKFLOW.create({ params: body });
    return jsonResponse({ instanceId: instance.id, status: 'started' });
  });

  router.get('/api/workflows/:workflowType/:instanceId', async (req) => {
    const { workflowType, instanceId } = req.params;
    const workflowBindings = {
      'job-crawling': env.JOB_CRAWLING_WORKFLOW,
      application: env.APPLICATION_WORKFLOW,
      'resume-sync': env.RESUME_SYNC_WORKFLOW,
      'daily-report': env.DAILY_REPORT_WORKFLOW,
    };

    const workflow = workflowBindings[workflowType];
    if (!workflow) {
      return jsonResponse({ error: 'Unknown workflow type' }, 404);
    }

    const instance = await workflow.get(instanceId);
    const status = await instance.status();
    return jsonResponse({ instanceId, status: status.status, output: status.output });
  });

  router.post('/api/workflows/application/:instanceId/approve', async (req) => {
    const { instanceId } = req.params;
    await env.SESSIONS.put(
      `workflow:application:${instanceId}:approval`,
      JSON.stringify({ approved: true, at: new Date().toISOString() }),
      { expirationTtl: 86400 }
    );
    return jsonResponse({ success: true, approved: true });
  });

  router.post('/api/workflows/application/:instanceId/reject', async (req) => {
    const { instanceId } = req.params;
    await env.SESSIONS.put(
      `workflow:application:${instanceId}:approval`,
      JSON.stringify({ approved: false, at: new Date().toISOString() }),
      { expirationTtl: 86400 }
    );
    return jsonResponse({ success: true, approved: false });
  });
}

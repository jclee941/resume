import { jsonResponse } from '../middleware/cors.js';

/**
 * @typedef {Request & { params: Record<string, string> }} WorkflowRequest
 *
 * @typedef {{
 *   create(options?: { params?: unknown }): Promise<{ id: string }>;
 *   get(instanceId: string): Promise<{ status(): Promise<{ status: string; output?: unknown }> }>;
 * }} WorkflowBinding
 *
 * @typedef {{
 *   get(path: string, handler: (req: WorkflowRequest) => Promise<Response> | Response): void;
 *   post(path: string, handler: (req: WorkflowRequest) => Promise<Response> | Response): void;
 * }} WorkflowRouter
 *
 * @typedef {{
 *   env: {
 *     JOB_CRAWLING_WORKFLOW: WorkflowBinding;
 *     APPLICATION_WORKFLOW: WorkflowBinding;
 *     RESUME_SYNC_WORKFLOW: WorkflowBinding;
 *     DAILY_REPORT_WORKFLOW: WorkflowBinding;
 *   };
 *   apps: {
 *     decideWorkflowApprovals(req: WorkflowRequest, decision: string): Promise<Response> | Response;
 *   };
 * }} WorkflowContext
 */

/**
 * @param {WorkflowRouter} router
 * @param {WorkflowContext} ctx
 */
export function registerWorkflowRoutes(router, ctx) {
  const { env, apps } = ctx;

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
    /** @type {Record<string, WorkflowBinding | undefined>} */
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

  router.post('/api/workflows/application/:instanceId/approve', (req) =>
    apps.decideWorkflowApprovals(req, 'approved')
  );

  router.post('/api/workflows/application/:instanceId/reject', (req) =>
    apps.decideWorkflowApprovals(req, 'rejected')
  );
}

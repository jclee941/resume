/**
 * @typedef {{
 *   get(path: string, handler: (req: Request) => Promise<Response> | Response): void;
 *   post(path: string, handler: (req: Request) => Promise<Response> | Response): void;
 *   put(path: string, handler: (req: Request) => Promise<Response> | Response): void;
 *   delete(path: string, handler: (req: Request) => Promise<Response> | Response): void;
 * }} RouterShape
 *
 * @typedef {{
 *   triggerJobSearch(req: Request): Promise<Response> | Response;
 *   triggerDailyReport(req: Request): Promise<Response> | Response;
 *   triggerResumeSync(req: Request): Promise<Response> | Response;
 *   triggerProfileSync(req: Request): Promise<Response> | Response;
 *   getProfileSyncStatus(req: Request): Promise<Response> | Response;
 *   updateProfileSyncStatus(req: Request): Promise<Response> | Response;
 *   testChaosResumes(req: Request): Promise<Response> | Response;
 * }} AutomationWebhooks
 *
 * @typedef {{
 *   status(req: Request): Promise<Response> | Response;
 *   run(req: Request): Promise<Response> | Response;
 *   start(req: Request): Promise<Response> | Response;
 *   configure(req: Request): Promise<Response> | Response;
 * }} AutomationAutoApply
 *
 * @typedef {{
 *   listResumeSyncHistory(req: Request): Promise<Response> | Response;
 *   getMasterResume(req: Request): Promise<Response> | Response;
 *   uploadMasterResume(req: Request): Promise<Response> | Response;
 * }} AutomationResumeMaster
 *
 * @typedef {{
 *   webhooks: AutomationWebhooks;
 *   autoApply: AutomationAutoApply;
 *   resumeMaster: AutomationResumeMaster;
 * }} AutomationContext
 */

/**
 * @param {RouterShape} router
 * @param {AutomationContext} ctx
 */
export function registerAutomationRoutes(router, ctx) {
  const { webhooks, autoApply, resumeMaster } = ctx;

  router.post('/api/automation/search', (req) => webhooks.triggerJobSearch(req));
  router.post('/api/automation/report', (req) => webhooks.triggerDailyReport(req));
  router.post('/api/automation/resume', (req) => webhooks.triggerResumeSync(req));

  router.get('/api/auto-apply/status', (req) => autoApply.status(req));
  router.post('/api/auto-apply/run', (req) => autoApply.run(req));
  router.post('/api/auto-apply/start', (req) => autoApply.start(req));
  router.get('/api/auto-apply/config', (req) => autoApply.configure(req));

  router.post('/api/automation/profile-sync', (req) => webhooks.triggerProfileSync(req));
  router.get('/api/automation/profile-sync/history', (req) =>
    resumeMaster.listResumeSyncHistory(req)
  );
  router.get('/api/automation/profile-sync/:syncId', (req) => webhooks.getProfileSyncStatus(req));
  router.post('/api/automation/profile-sync/callback', (req) =>
    webhooks.updateProfileSyncStatus(req)
  );

  router.get('/api/resume/master', (req) => resumeMaster.getMasterResume(req));
  router.put('/api/resume/master', (req) => resumeMaster.uploadMasterResume(req));

  router.get('/api/test/chaos-resumes', (req) => webhooks.testChaosResumes(req));
}

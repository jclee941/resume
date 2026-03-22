export function registerAutomationRoutes(router, ctx) {
  const { webhooks, autoApply, resumeMaster } = ctx;

  router.post('/api/automation/search', (req) => webhooks.triggerJobSearch(req));
  router.post('/api/automation/apply', (req) => webhooks.triggerAutoApply(req));
  router.post('/api/automation/report', (req) => webhooks.triggerDailyReport(req));
  router.post('/api/automation/resume', (req) => webhooks.triggerResumeSync(req));

  router.get('/api/auto-apply/status', (req) => autoApply.status(req));
  router.post('/api/auto-apply/run', (req) => autoApply.run(req));
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

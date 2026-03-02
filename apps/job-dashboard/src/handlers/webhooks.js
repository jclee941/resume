import { JobSearchHandler } from './job-search-handler.js';
import { ResumeSyncHandler } from './resume-sync-handler.js';
import { AutoApplyWebhookHandler } from './auto-apply-webhook-handler.js';
import { ReportHandler } from './report-handler.js';
import { SlackHandler } from './slack-handler.js';
import { ProfileSyncHandler } from './profile-sync-handler.js';
import { TestHandler } from './test-handler.js';

export class WebhookHandler {
  constructor(env, auth) {
    this.env = env;
    this.auth = auth;

    this.jobSearch = new JobSearchHandler(env, auth);
    this.resumeSync = new ResumeSyncHandler(env, auth);
    this.autoApply = new AutoApplyWebhookHandler(env, auth);
    this.report = new ReportHandler(env, auth);
    this.slack = new SlackHandler(env, auth);
    this.profileSync = new ProfileSyncHandler(env, auth);
    this.test = new TestHandler(env, auth);
  }

  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  triggerJobSearch(request) {
    return this.jobSearch.triggerJobSearch(request);
  }

  fetchWantedJobs(keyword, options) {
    return this.jobSearch.fetchWantedJobs(keyword, options);
  }

  triggerResumeSync(request) {
    return this.resumeSync.triggerResumeSync(request);
  }

  triggerAutoApply(request) {
    return this.autoApply.triggerAutoApply(request);
  }

  triggerDailyReport(request) {
    return this.report.triggerDailyReport(request);
  }

  notifySlack(request) {
    return this.slack.notifySlack(request);
  }

  handleSlackInteraction(request) {
    return this.slack.handleSlackInteraction(request);
  }

  triggerProfileSync(request) {
    return this.profileSync.triggerProfileSync(request);
  }

  getProfileSyncStatus(request) {
    return this.profileSync.getProfileSyncStatus(request);
  }

  updateProfileSyncStatus(request) {
    return this.profileSync.updateProfileSyncStatus(request);
  }

  testChaosResumes(request) {
    return this.test.testChaosResumes(request);
  }
}

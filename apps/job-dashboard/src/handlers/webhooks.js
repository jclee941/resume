import { JobSearchHandler } from './job-search-handler.js';
import { ResumeSyncHandler } from './resume-sync-handler.js';
import { AutoApplyWebhookHandler } from './auto-apply-webhook-handler.js';
import { ReportHandler } from './report-handler.js';
import { ProfileSyncHandler } from './profile-sync-handler.js';
import { TestHandler } from './test-handler.js';
import { TelegramWebhookHandler } from './telegram-webhook-handler.js';

/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       run(): Promise<{ meta?: { changes?: number }; [key: string]: unknown }>;
 *       all<T = unknown>(): Promise<{ results?: T[] }>;
 *       first<T = unknown>(): Promise<T | null>;
 *     };
 *     all<T = unknown>(): Promise<{ results?: T[] }>;
 *     first<T = unknown>(): Promise<T | null>;
 *   };
 * }} WebhookDb
 *
 * @typedef {{
 *   DB?: WebhookDb;
 *   TELEGRAM_BOT_TOKEN?: string;
 *   TELEGRAM_CHAT_ID?: string | number;
 *   [key: string]: unknown;
 * }} WebhookEnv
 *
 * @typedef {import('./auto-apply-webhook-handler.js').AutoApplyAuth &
 *   Record<string, unknown>} WebhookAuth
 */

export class WebhookHandler {
  /**
   * @param {WebhookEnv} env
   * @param {WebhookAuth} auth
   */
  constructor(env, auth) {
    this.env = env;
    this.auth = auth;

    this.jobSearch = new JobSearchHandler(env, auth);
    this.resumeSync = new ResumeSyncHandler(env, auth);
    this.autoApply = new AutoApplyWebhookHandler(env, auth);
    this.report = new ReportHandler(env, auth);
    this.profileSync = new ProfileSyncHandler(env, auth);
    this.test = new TestHandler(env, auth);
    this.telegram = new TelegramWebhookHandler(env);
  }

  /**
   * @param {unknown} data
   * @param {number} [status]
   * @returns {Response}
   */
  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  triggerJobSearch(request) {
    return this.jobSearch.triggerJobSearch(request);
  }

  /**
   * @param {string} keyword
   * @param {Record<string, unknown>} [options]
   * @returns {Promise<unknown>}
   */
  fetchWantedJobs(keyword, options) {
    return this.jobSearch.fetchWantedJobs(keyword, options);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  triggerResumeSync(request) {
    return this.resumeSync.triggerResumeSync(request);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  triggerAutoApply(request) {
    return this.autoApply.triggerAutoApply(request);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  triggerDailyReport(request) {
    return this.report.triggerDailyReport(request);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  triggerProfileSync(request) {
    return this.profileSync.triggerProfileSync(request);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  getProfileSyncStatus(request) {
    return this.profileSync.getProfileSyncStatus(request);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  updateProfileSyncStatus(request) {
    return this.profileSync.updateProfileSyncStatus(request);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  testChaosResumes(request) {
    return this.test.testChaosResumes(request);
  }
}

export default WebhookHandler;

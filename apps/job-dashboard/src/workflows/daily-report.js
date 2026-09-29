/// <reference path="../../../../packages/types/src/cloudflare-workers.d.ts" />
import { WorkflowEntrypoint } from 'cloudflare:workers';
import { sendTelegramNotification } from '../services/notifications.js';
import { formatReportMessage, generateReportContent } from './daily-report-content.js';
import {
  calculateTrends,
  getApplicationStats,
  getPlatformStats,
  getSearchStats,
} from './daily-report-stats.js';

/**
 * @typedef {{
 *   prepare(query: string): {
 *     first(): Promise<Record<string, number | null> | null>;
 *     all(): Promise<{ results?: Array<{ platform: string; count: number; success: number }> }>;
 *     bind(...values: unknown[]): {
 *       run(): Promise<unknown>;
 *       first(): Promise<unknown>;
 *       all(): Promise<{ results?: Array<unknown> }>;
 *     };
 *   };
 * }} DailyReportDb
 *
 * @typedef {import('./daily-report-stats.js').DailyReportEnv &
 *   import('../services/notifications.js').NotificationEnv & {
 *   JOB_DB: DailyReportDb;
 *   TELEGRAM_BOT_TOKEN?: string;
 *   TELEGRAM_CHAT_ID?: string;
 *   [key: string]: unknown;
 * }} DailyReportWorkflowEnv
 *
 * @typedef {{
 *   type?: string;
 *   date?: string;
 * }} DailyReportParams
 *
 * @typedef {{
 *   id: string;
 *   type: string;
 *   generatedAt: string;
 *   date: string;
 *   status: string;
 *   completedAt?: string;
 *   applications?: Awaited<ReturnType<typeof getApplicationStats>>;
 *   platforms?: Awaited<ReturnType<typeof getPlatformStats>>;
 *   searches?: Awaited<ReturnType<typeof getSearchStats>>;
 *   trends?: Awaited<ReturnType<typeof calculateTrends>>;
 *   content?: ReturnType<typeof generateReportContent>;
 * }} ReportRecord
 */

/**
 * Daily Report Workflow
 *
 * Generates and sends daily/weekly job application reports.
 * Aggregates stats, formats report, and emits notifications.
 *
 * @extends {WorkflowEntrypoint<DailyReportWorkflowEnv, DailyReportParams>}
 */
export class DailyReportWorkflow extends WorkflowEntrypoint {
  /**
   * @param {import('cloudflare:workers').WorkflowEvent<DailyReportParams>} event
   * @param {import('cloudflare:workers').WorkflowStep} step
   */
  async run(event, step) {
    const { type = 'daily', date } = event.payload;

    /** @type {ReportRecord} */
    const report = {
      id: event.instanceId,
      type,
      generatedAt: new Date().toISOString(),
      date: date || new Date().toISOString().split('T')[0],
      status: 'running',
    };

    // Step 1: Gather application statistics
    const appStats = await step.do(
      'gather-app-stats',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        return await getApplicationStats(this.env, type, report.date);
      }
    );

    report.applications = appStats;

    // Step 2: Gather platform-specific stats
    const platformStats = await step.do(
      'gather-platform-stats',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        return await getPlatformStats(this.env, type, report.date);
      }
    );

    report.platforms = platformStats;

    // Step 3: Gather job search stats
    const searchStats = await step.do(
      'gather-search-stats',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        return await getSearchStats(this.env, type, report.date);
      }
    );

    report.searches = searchStats;

    // Step 4: Calculate trends
    const trends = await step.do(
      'calculate-trends',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        return await calculateTrends(this.env, appStats, type, report.date);
      }
    );

    report.trends = trends;

    // Step 5: Generate report content
    const content = await step.do(
      'generate-content',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        return generateReportContent(
          /** @type {import('./daily-report-content.js').DailyReport} */ (report)
        );
      }
    );

    report.content = content;

    await step.do(
      'send-notification',
      {
        retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' },
        timeout: '30 seconds',
      },
      async () => {
        await sendTelegramNotification(this.env, formatReportMessage(content));
        return { notified: true };
      }
    );

    report.status = 'completed';
    report.completedAt = new Date().toISOString();

    return {
      success: true,
      report,
    };
  }

  /**
   * @param {string | { text: string }} message
   */
  async sendNotification(message) {
    await sendTelegramNotification(this.env, message);
  }
}

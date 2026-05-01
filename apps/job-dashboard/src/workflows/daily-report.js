import { WorkflowEntrypoint } from 'cloudflare:workers';
import { sendTelegramNotification, escapeHtml } from '../services/notifications.js';
import { generateReportContent } from './daily-report-content.js';
import {
  calculateTrends,
  getApplicationStats,
  getPlatformStats,
  getSearchStats,
} from './daily-report-stats.js';

/**
 * Daily Report Workflow
 *
 * Generates and sends daily/weekly job application reports.
 * Aggregates stats, formats report, and emits notifications.
 *
 * @param {Object} params
 * @param {string} params.type - Report type: 'daily' or 'weekly'
 * @param {string} params.date - Report date (optional, defaults to today)
 */
export class DailyReportWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { type = 'daily', date } = event.payload;

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
        return await calculateTrends(this.env, appStats, type);
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
        return generateReportContent(report);
      }
    );

    report.content = content;

    // Step 6: Save report to database
    await step.do(
      'save-report',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        await this.env.JOB_DB.prepare(
          `
          INSERT INTO reports (id, type, date, data, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT (type, date) DO UPDATE SET data = excluded.data, updated_at = datetime('now')
        `
        )
          .bind(report.id, type, report.date, JSON.stringify(report))
          .run();
      }
    );

    await step.do(
      'send-notification',
      {
        retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' },
        timeout: '30 seconds',
      },
      async () => {
        await sendTelegramNotification(
          this.env,
          `📊 <b>${escapeHtml(content.title)}</b>\n\nDate: ${escapeHtml(content.date)}\nType: ${escapeHtml(type)}`
        );
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

  async sendReport(content, _type) {
    await sendTelegramNotification(this.env, content);
  }

  async sendNotification(message) {
    await sendTelegramNotification(this.env, message);
  }
}

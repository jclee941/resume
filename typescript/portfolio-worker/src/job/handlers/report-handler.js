import { BaseHandler } from './base-handler.js';
import { sendSlackMessage } from '../services/slack.js';
import { normalizeError } from '../lib/errors.js';

/**
 * Handler for report generation operations.
 * Generates daily reports and sends to Slack.
 */
export class ReportHandler extends BaseHandler {
  /**
   * Trigger daily report generation
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async triggerDailyReport(_request) {
    const db = this.env?.DB;
    if (!db) {
      return this.jsonResponse({ success: false, error: 'Database not configured' }, 503);
    }

    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // 1. Get status summary
      const statusSummary = await db
        .prepare(
          `SELECT status, COUNT(*) as count 
           FROM applications 
           GROUP BY status`
        )
        .all();

      // 2. Get today's new applications
      const todayNew = await db
        .prepare(
          `SELECT COUNT(*) as count 
           FROM applications 
           WHERE date(created_at) = date('now')`
        )
        .first();

      // 3. Get this week's applications by day
      const weeklyActivity = await db
        .prepare(
          `SELECT date(created_at) as date, COUNT(*) as count 
           FROM applications 
           WHERE created_at >= ? 
           GROUP BY date(created_at) 
           ORDER BY date DESC`
        )
        .bind(weekAgoStr)
        .all();

      // 4. Get high-priority pending items
      const pendingHighPriority = await db
        .prepare(
          `SELECT id, company, position, match_score, created_at 
           FROM applications 
           WHERE status IN ('saved', 'reviewing') 
             AND match_score >= 80 
           ORDER BY match_score DESC 
           LIMIT 5`
        )
        .all();

      // 5. Get recent status changes
      const recentChanges = await db
        .prepare(
          `SELECT t.application_id, t.status, t.note, t.timestamp, a.company, a.position 
           FROM application_timeline t 
           JOIN applications a ON t.application_id = a.id 
           WHERE t.timestamp >= ? 
           ORDER BY t.timestamp DESC 
           LIMIT 10`
        )
        .bind(yesterdayStr)
        .all();

      const report = {
        generatedAt: now.toISOString(),
        summary: {
          total: (statusSummary.results || []).reduce((sum, r) => sum + r.count, 0),
          byStatus: Object.fromEntries(
            (statusSummary.results || []).map((r) => [r.status, r.count])
          ),
          newToday: todayNew?.count || 0,
        },
        weeklyActivity: (weeklyActivity.results || []).map((r) => ({
          date: r.date,
          count: r.count,
        })),
        pendingHighPriority: (pendingHighPriority.results || []).map((r) => ({
          id: r.id,
          company: r.company,
          position: r.position,
          matchScore: r.match_score,
        })),
        recentChanges: (recentChanges.results || []).map((r) => ({
          company: r.company,
          position: r.position,
          status: r.status,
          note: r.note,
          timestamp: r.timestamp,
        })),
      };

      // 6. Send to Slack
      const statusLine = Object.entries(report.summary.byStatus)
        .map(([status, count]) => `${status}: ${count}`)
        .join(' | ');

      const highPriorityList =
        report.pendingHighPriority.length > 0
          ? report.pendingHighPriority
              .map((j) => `\u2022 ${j.company} - ${j.position} (${j.matchScore}%)`)
              .join('\n')
          : 'None';

      await sendSlackMessage(this.env, {
        text: `\ud83d\udcca Daily Job Report - ${now.toISOString().split('T')[0]}`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '\ud83d\udcca Daily Job Report' },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Summary*\nTotal: ${report.summary.total} | New Today: ${report.summary.newToday}\n${statusLine}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*High Priority (80%+ match)*\n${highPriorityList}`,
            },
          },
        ],
      });

      return this.jsonResponse({
        success: true,
        message: 'Daily report generated',
        report,
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ReportHandler',
        action: 'triggerDailyReport',
      });
      console.error('Daily report generation failed:', normalized);
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }
}

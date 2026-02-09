import { BaseHandler } from './base-handler.js';
import { normalizeError } from '../../../src/shared/errors/index.js';

/**
 * Handler for Slack notification and interaction operations.
 */
export class SlackHandler extends BaseHandler {
  /**
   * Send notification to Slack
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async notifySlack(request) {
    const body = await request.json();
    const { type, data } = body;
    const webhookUrl = this.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      return this.jsonResponse({ success: false, error: 'Slack webhook not configured' }, 400);
    }

    let message;
    switch (type) {
      case 'high_match_job':
        message = {
          text: `\ud83c\udfaf High Match Job: ${data.job?.title} at ${data.job?.company}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${data.job?.title}*\n${data.job?.company} | Match: ${data.job?.matchScore}%`,
              },
            },
          ],
        };
        break;

      case 'status_change':
        message = {
          text: `\ud83d\udccb Status changed: ${data.application?.company} - ${data.oldStatus} \u2192 ${data.newStatus}`,
        };
        break;

      case 'daily_report':
        message = {
          text: `\ud83d\udcca Daily Report: ${data.report?.newApplications || 0} new, ${data.report?.applied || 0} applied`,
        };
        break;

      default:
        message = { text: data.text || 'Notification from Job Dashboard' };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(10000),
      });

      return this.jsonResponse({ success: response.ok });
    } catch (error) {
      const normalized = normalizeError(error, { handler: 'SlackHandler', action: 'notifySlack' });
      console.error('Slack notification failed:', normalized);
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }

  /**
   * Handle Slack interactive component callbacks
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async handleSlackInteraction(request) {
    const body = await request.json();
    const payload = body.payload ? JSON.parse(body.payload) : body;

    const actions = payload.actions || [];
    if (actions.length === 0) {
      return this.jsonResponse({ ok: true });
    }

    const action = actions[0];
    const actionId = action.action_id;
    const value = action.value;

    if (actionId?.startsWith('apply_')) {
      return this.jsonResponse({
        response_type: 'ephemeral',
        text: `Processing application: ${value}`,
      });
    }

    if (actionId?.startsWith('skip_')) {
      return this.jsonResponse({
        response_type: 'ephemeral',
        text: `Skipped: ${value}`,
      });
    }

    return this.jsonResponse({ ok: true });
  }
}

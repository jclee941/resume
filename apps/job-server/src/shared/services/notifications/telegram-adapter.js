import {
  createApplicationFailedMessage,
  createApplicationSuccessMessage,
  createApprovalRequestMessage,
  createCaptchaDetectedMessage,
  createDailySummaryMessage,
} from './telegram-adapter/formatters.js';
import { answerCallbackQuery, notify } from './telegram-adapter/delivery.js';
import { handleCallbackQuery } from './telegram-adapter/callbacks.js';

export { escapeHtml } from './telegram-adapter/formatters.js';

export class TelegramNotificationAdapter {
  constructor(options = {}) {
    const env = options.env || process.env;

    this.env = env;
    this.logger = options.logger || console;
    this.source = options.source || 'job-server';

    this.telegramToken = options.telegramToken || env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = options.telegramChatId || env.TELEGRAM_CHAT_ID;
    this.n8nWebhookUrl = options.n8nWebhookUrl || env.N8N_WEBHOOK_URL || env.N8N_URL;

    this.db = options.db || env.DB || null;
    this.d1Client = options.d1Client || null;

    this.handlers = {
      onApprove: options.onApprove,
      onReject: options.onReject,
      onView: options.onView,
    };

    this.rateState = {
      windowStartedAt: 0,
      count: 0,
    };
  }

  async sendApprovalRequest(job, matchScore, applicationId) {
    const score = Number(matchScore) || 0;

    if (score < 60 || score > 74) {
      return {
        sent: false,
        reason: 'out_of_review_range',
        matchScore: score,
      };
    }

    const message = createApprovalRequestMessage(job, score, applicationId);

    return notify(this, 'approval_required', { job, matchScore: score, applicationId }, message);
  }

  async sendApplicationSuccess(job, applicationId, platform) {
    const message = createApplicationSuccessMessage(job, applicationId, platform);

    return notify(
      this,
      'application_success',
      { job, applicationId, platform, timestamp: new Date().toISOString() },
      message
    );
  }

  async sendApplicationFailed(job, applicationId, error, platform) {
    const errorText = error?.message || String(error || 'Unknown error');
    const message = createApplicationFailedMessage(job, applicationId, error, platform);

    return notify(
      this,
      'application_failed',
      {
        job,
        applicationId,
        platform,
        error: errorText,
        timestamp: new Date().toISOString(),
      },
      message
    );
  }

  async sendDailySummary(stats = {}) {
    const { payload, message } = createDailySummaryMessage(stats);

    return notify(this, 'daily_summary', payload, message);
  }

  async sendCaptchaDetected(job, platform) {
    const message = createCaptchaDetectedMessage(job, platform);

    return notify(
      this,
      'captcha_detected',
      {
        job,
        platform,
        timestamp: new Date().toISOString(),
      },
      message
    );
  }

  async handleCallbackQuery(query, handlers = {}) {
    return handleCallbackQuery(this, query, handlers);
  }

  async answerCallbackQuery(callbackQueryId, text) {
    return answerCallbackQuery(this, callbackQueryId, text);
  }
}

export function createTelegramNotificationAdapter(options = {}) {
  return new TelegramNotificationAdapter(options);
}

export default TelegramNotificationAdapter;

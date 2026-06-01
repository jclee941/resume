import {
  createApplicationFailedMessage,
  createApplicationSuccessMessage,
  createApprovalRequestMessage,
  createCaptchaDetectedMessage,
  createDailySummaryMessage,
  createJobPostingsMessage,
  createSingleJobMessage,
} from './telegram-adapter/formatters.js';
import { answerCallbackQuery, notify } from './telegram-adapter/delivery.js';
import { splitForTelegram } from './telegram-adapter/message-splitter.js';
import { handleCallbackQuery } from './telegram-adapter/callbacks.js';

export { escapeHtml, createJobPostingsMessage } from './telegram-adapter/formatters.js';

export class TelegramNotificationAdapter {
  constructor(options = {}) {
    const env = options.env || process.env;

    this.env = env;
    this.logger = options.logger || console;
    this.source = options.source || 'job-server';

    this.telegramToken = options.telegramToken || env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = options.telegramChatId || env.TELEGRAM_CHAT_ID;
    this.n8nWebhookUrl = options.n8nWebhookUrl || env.N8N_WEBHOOK_URL || env.N8N_URL;
    this.fetchImpl = options.fetchImpl || null;

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

  /**
   * Send a list of job postings (with clickable URLs) to Telegram.
   *
   * @param {Array<object>} jobs
   * @param {{limit?:number, header?:string}} [options]
   */
  async sendJobPostings(jobs = [], options = {}) {
    const message = createJobPostingsMessage(jobs, options);
    return notify(
      this,
      'job_postings',
      { count: Array.isArray(jobs) ? jobs.length : 0, timestamp: new Date().toISOString() },
      message
    );
  }

  /**
   * Send recommended job postings as SEPARATE Telegram messages — one message
   * per job, and each job's message further length-split into <=4096-char
   * chunks (Telegram-safe, never breaking an HTML tag). Reuses the existing
   * notify()/raw-sender path so rate limiting and retries still apply.
   *
   * @param {Array<object>} jobs
   * @param {{limit?:number, header?:string}} [options]
   * @returns {Promise<{sent:number, failed:number, messages:number, results:Array}>}
   */
  async sendJobPostingsSeparately(jobs = [], options = {}) {
    const list = Array.isArray(jobs) ? jobs : [];
    const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : list.length;
    const selected = list.slice(0, limit);

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const job of selected) {
      const message = createSingleJobMessage(job, options);
      const chunks = splitForTelegram(message.text);
      let jobOk = true;
      for (const chunk of chunks) {
        const payload = {
          text: chunk,
          parse_mode: message.parse_mode,
          disable_web_page_preview: message.disable_web_page_preview,
        };
        const result = await notify(
          this,
          'job_posting',
          { timestamp: new Date().toISOString() },
          payload
        );
        results.push(result);
        if (!result.sent) jobOk = false;
      }
      if (jobOk) sent += 1;
      else failed += 1;
    }

    return { sent, failed, messages: selected.length, results };
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

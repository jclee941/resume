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

/**
 * @typedef {{
 *   env?: { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string; AUTOMATION_WEBHOOK_URL?: string; WEBHOOK_URL?: string; DB?: import('./telegram-adapter/history.js').D1DatabaseLike };
 *   logger?: import('./telegram-adapter/history.js').LoggerLike;
 *   source?: string;
 *   telegramToken?: string;
 *   telegramChatId?: string;
 *   automationWebhookUrl?: string;
 *   fetchImpl?: typeof fetch | null;
 *   sleepImpl?: (ms: number) => Promise<unknown>;
 *   db?: import('./telegram-adapter/history.js').D1DatabaseLike | null;
 *   d1Client?: import('./telegram-adapter/history.js').D1ClientLike | null;
 *   onApprove?: import('./telegram-adapter/callbacks.js').CallbackHandler;
 *   onReject?: import('./telegram-adapter/callbacks.js').CallbackHandler;
 *   onView?: import('./telegram-adapter/callbacks.js').CallbackHandler;
 *   [key: string]: unknown;
 * }} TelegramAdapterOptions
 *
 * @typedef {{
 *   sent?: boolean,
 *   reason?: string,
 *   resetTime?: number,
 *   [key: string]: unknown,
 * }} TelegramSendResult
 */

// Max times sendJobPostingsSeparately will wait out a full rate-limit window
// and retry a single chunk before counting it as failed.
const MAX_RATE_LIMIT_WAITS = 3;

export class TelegramNotificationAdapter {
  /**
   * @param {TelegramAdapterOptions} [options]
   */
  constructor(options = {}) {
    /** @type {NonNullable<TelegramAdapterOptions['env']>} */
    const env = options.env || process.env;

    this.env = env;
    /** @type {import('./telegram-adapter/history.js').LoggerLike} */
    this.logger = options.logger || console;
    this.source = options.source || 'job-server';

    this.telegramToken = options.telegramToken || env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = options.telegramChatId || env.TELEGRAM_CHAT_ID;
    this.automationWebhookUrl =
      options.automationWebhookUrl || env.AUTOMATION_WEBHOOK_URL || env.WEBHOOK_URL;
    /** @type {typeof fetch | undefined} */
    this.fetchImpl = /** @type {typeof fetch | undefined} */ (options.fetchImpl || null);
    this.sleepImpl =
      options.sleepImpl || ((/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms)));

    /** @type {import('./telegram-adapter/history.js').D1DatabaseLike | undefined} */
    this.db = /** @type {import('./telegram-adapter/history.js').D1DatabaseLike | undefined} */ (
      options.db || env.DB || null
    );
    /** @type {import('./telegram-adapter/history.js').D1ClientLike | undefined} */
    this.d1Client =
      /** @type {import('./telegram-adapter/history.js').D1ClientLike | undefined} */ (
        options.d1Client || null
      );

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
   * @param {Array<Record<string, unknown>>} jobs
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
   * @param {Array<import('./telegram-adapter/formatters.js').SingleJobInput>} jobs
   * @param {{limit?:number, header?:string}} [options]
   * @returns {Promise<{sent:number, failed:number, messages:number, results:Array<unknown>}>}
   */
  async sendJobPostingsSeparately(jobs = [], options = {}) {
    const list = Array.isArray(jobs) ? jobs : [];
    const limit =
      Number.isInteger(options.limit) && /** @type {number} */ (options.limit) > 0
        ? /** @type {number} */ (options.limit)
        : list.length;
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

        // Send this chunk, waiting out the local rate-limit window if needed.
        // The adapter enforces 20 sends/min; for bulk separate sends we pace
        // rather than silently dropping rate-limited chunks.
        let result;
        let telegramSent = false;
        for (let attempt = 0; attempt <= MAX_RATE_LIMIT_WAITS; attempt += 1) {
          result = await notify(
            this,
            'job_posting',
            { timestamp: new Date().toISOString() },
            payload
          );
          const tg = /** @type {TelegramSendResult | undefined} */ (result?.results?.telegram);
          telegramSent = tg?.sent === true;
          if (telegramSent) break;
          if (tg?.reason === 'rate_limited' && attempt < MAX_RATE_LIMIT_WAITS) {
            const waitMs = Math.max(0, (tg.resetTime ?? Date.now()) - Date.now()) + 50;
            await this.sleepImpl(waitMs);
            continue;
          }
          break; // non-rate-limit failure, or out of retries
        }
        results.push(result);
        if (!telegramSent) {
          jobOk = false;
          // Stop sending the remaining chunks of this job — a partially-sent
          // job would arrive as truncated/incomplete content in Telegram.
          break;
        }
      }
      if (jobOk) sent += 1;
      else failed += 1;
    }

    return { sent, failed, messages: selected.length, results };
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {number | string} matchScore
   * @param {string} applicationId
   */
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

  /**
   * @param {Record<string, unknown>} job
   * @param {string} applicationId
   * @param {string} platform
   */
  async sendApplicationSuccess(job, applicationId, platform) {
    const message = createApplicationSuccessMessage(job, applicationId, platform);

    return notify(
      this,
      'application_success',
      { job, applicationId, platform, timestamp: new Date().toISOString() },
      message
    );
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {string} applicationId
   * @param {Error | { message?: string } | null | undefined} [error]
   * @param {string} [platform]
   */
  async sendApplicationFailed(job, applicationId, error, platform) {
    const errorText =
      /** @type {{ message?: string } | null} */ (error)?.message ||
      String(error || 'Unknown error');
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

  /**
   * @param {Record<string, unknown>} [stats]
   */
  async sendDailySummary(stats = {}) {
    const { payload, message } = createDailySummaryMessage(stats);

    return notify(this, 'daily_summary', payload, message);
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {string} platform
   */
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

  /**
   * @param {import('./telegram-adapter/callbacks.js').CallbackQuery} query
   * @param {import('./telegram-adapter/callbacks.js').CallbackHandlers} [handlers]
   */
  async handleCallbackQuery(query, handlers = {}) {
    return handleCallbackQuery(this, query, handlers);
  }

  /**
   * @param {string} callbackQueryId
   * @param {string} text
   */
  async answerCallbackQuery(callbackQueryId, text) {
    return answerCallbackQuery(this, callbackQueryId, text);
  }
}

export default TelegramNotificationAdapter;

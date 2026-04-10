const TELEGRAM_MAX_LENGTH = 4096;
const TELEGRAM_TIMEOUT_MS = 10000;
const N8N_TIMEOUT_MS = 10000;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const RATE_LIMIT_MAX_PER_MINUTE = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const TELEGRAM_ALLOWED_HTML_TAGS =
  /<(b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-spoiler|blockquote)[\s>]/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function escapeHtml(text) {
  if (text == null) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatNotificationText(message) {
  let text;

  if (typeof message === 'string') {
    text = message;
  } else if (message && typeof message === 'object') {
    if (typeof message.text === 'string') {
      text = message.text;
    } else {
      try {
        text = JSON.stringify(message, null, 2);
      } catch {
        text = String(message);
      }
    }
  } else {
    text = String(message ?? '');
  }

  if (!TELEGRAM_ALLOWED_HTML_TAGS.test(text)) {
    text = escapeHtml(text);
  }

  if (text.length > TELEGRAM_MAX_LENGTH) {
    text = `${text.slice(0, TELEGRAM_MAX_LENGTH - 20)}\n\n[...truncated]`;
  }

  return text;
}

function isRetryableError(error, status) {
  if (!error && !status) return false;

  if (
    error?.name === 'TypeError' ||
    error?.name === 'AbortError' ||
    error?.code === 'ECONNRESET' ||
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'ECONNREFUSED'
  ) {
    return true;
  }

  return status === 429 || status >= 500;
}

function resolveJobField(job, ...keys) {
  for (const key of keys) {
    if (job?.[key] != null && job[key] !== '') return job[key];
  }
  return '';
}

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

    const message = {
      text:
        '🔔 <b>Job Application Approval Request</b>\n\n' +
        `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
        `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
        `<b>Platform:</b> ${escapeHtml(resolveJobField(job, 'platform', 'source'))}\n` +
        `<b>Match Score:</b> ${score}/100\n` +
        `<b>Application ID:</b> <code>${escapeHtml(applicationId)}</code>\n\n` +
        '<b>Actions:</b> Approve or reject below',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: `approve:${applicationId}` },
            { text: '❌ Reject', callback_data: `reject:${applicationId}` },
          ],
          [{ text: '📋 View Details', callback_data: `view:${applicationId}` }],
        ],
      },
    };

    return this.#notify('approval_required', { job, matchScore: score, applicationId }, message);
  }

  async sendApplicationSuccess(job, applicationId, platform) {
    const message = {
      text:
        '✅ <b>Application Submitted Successfully</b>\n\n' +
        `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
        `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
        `<b>Platform:</b> ${escapeHtml(platform || resolveJobField(job, 'platform', 'source'))}\n` +
        `<b>Application ID:</b> <code>${escapeHtml(applicationId)}</code>`,
      parse_mode: 'HTML',
    };

    return this.#notify(
      'application_success',
      { job, applicationId, platform, timestamp: new Date().toISOString() },
      message
    );
  }

  async sendApplicationFailed(job, applicationId, error, platform) {
    const errorText = error?.message || String(error || 'Unknown error');

    const message = {
      text:
        '❌ <b>Application Failed</b>\n\n' +
        `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
        `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
        `<b>Platform:</b> ${escapeHtml(platform || resolveJobField(job, 'platform', 'source'))}\n` +
        `<b>Application ID:</b> <code>${escapeHtml(applicationId)}</code>\n` +
        `<b>Error:</b> <pre>${escapeHtml(errorText)}</pre>`,
      parse_mode: 'HTML',
    };

    return this.#notify(
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
    const date = stats.date || new Date().toISOString().split('T')[0];
    const applied = Number(stats.applied ?? stats.success ?? 0);
    const pending = Number(stats.pending ?? stats.awaitingApproval ?? 0);
    const failed = Number(stats.failed ?? 0);
    const total = Number(stats.total ?? applied + pending + failed);
    const successRate = total > 0 ? Math.round((applied / total) * 100) : 0;

    const message = {
      text:
        '📊 <b>Daily Application Summary</b>\n\n' +
        `<b>Date:</b> ${escapeHtml(date)}\n` +
        `<b>Total:</b> ${total}\n` +
        `<b>Applied:</b> ${applied}\n` +
        `<b>Pending Approval:</b> ${pending}\n` +
        `<b>Failed:</b> ${failed}\n` +
        `<b>Success Rate:</b> ${successRate}%`,
      parse_mode: 'HTML',
    };

    return this.#notify(
      'daily_summary',
      { ...stats, date, total, applied, pending, failed, successRate },
      message
    );
  }

  async sendCaptchaDetected(job, platform) {
    const message = {
      text:
        '🤖 <b>CAPTCHA Detected - Manual Intervention Required</b>\n\n' +
        `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
        `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
        `<b>Platform:</b> ${escapeHtml(platform || resolveJobField(job, 'platform', 'source'))}\n\n` +
        'Please resolve CAPTCHA manually and resume automation.',
      parse_mode: 'HTML',
    };

    return this.#notify(
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
    try {
      const callbackData = query?.data;
      const callbackId = query?.id;

      if (!callbackData || typeof callbackData !== 'string') {
        return { handled: false, reason: 'invalid_callback_data' };
      }

      const [action, applicationId] = callbackData.split(':');
      if (!action || !applicationId) {
        await this.answerCallbackQuery(callbackId, 'Invalid callback payload');
        return { handled: false, reason: 'invalid_callback_format' };
      }

      const mergedHandlers = {
        ...this.handlers,
        ...handlers,
      };

      let result;
      if (action === 'approve') {
        if (typeof mergedHandlers.onApprove === 'function') {
          result = await mergedHandlers.onApprove(applicationId, query);
        } else {
          result = await this.#updateApprovalStatus(applicationId, 'approved');
        }
      } else if (action === 'reject') {
        if (typeof mergedHandlers.onReject === 'function') {
          result = await mergedHandlers.onReject(applicationId, query);
        } else {
          result = await this.#updateApprovalStatus(applicationId, 'rejected');
        }
      } else if (action === 'view') {
        if (typeof mergedHandlers.onView === 'function') {
          result = await mergedHandlers.onView(applicationId, query);
        } else {
          result = {
            success: true,
            message: `Application ID: ${applicationId}`,
          };
        }
      } else {
        await this.answerCallbackQuery(callbackId, `Unknown action: ${action}`);
        return { handled: false, reason: 'unknown_action', action };
      }

      const callbackMessage = result?.message || `${action} processed`;
      await this.answerCallbackQuery(callbackId, callbackMessage);

      await this.#saveNotificationHistory({
        id: crypto.randomUUID(),
        eventType: 'approval_callback',
        data: {
          action,
          applicationId,
          callbackId,
        },
        channels: ['telegram'],
        timestamp: new Date().toISOString(),
        status: result?.success === false ? 'failed' : 'success',
        results: result,
      });

      return {
        handled: true,
        action,
        applicationId,
        result,
      };
    } catch (error) {
      this.logger.error('[TelegramNotificationAdapter] handleCallbackQuery error:', error?.message);
      return {
        handled: false,
        reason: 'callback_handler_error',
        error: error?.message,
      };
    }
  }

  async answerCallbackQuery(callbackQueryId, text) {
    if (!this.telegramToken || !callbackQueryId) {
      return { sent: false, reason: 'not_configured' };
    }

    const endpoint = `https://api.telegram.org/bot${this.telegramToken}/answerCallbackQuery`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: String(text || 'Processed').slice(0, 200),
        }),
      });

      return { sent: response.ok };
    } catch (error) {
      this.logger.error('[TelegramNotificationAdapter] answerCallbackQuery error:', error?.message);
      return {
        sent: false,
        reason: 'fetch_error',
        error: error?.message,
      };
    }
  }

  async #notify(eventType, data, telegramPayload) {
    const historyRecord = {
      id: crypto.randomUUID(),
      eventType,
      data,
      channels: [],
      timestamp: new Date().toISOString(),
      status: 'pending',
      results: {},
    };

    let telegramResult = { sent: false, reason: 'not_attempted' };
    let n8nResult = { sent: false, reason: 'not_attempted' };

    if (this.telegramToken && this.telegramChatId) {
      historyRecord.channels.push('telegram');
      telegramResult = await this.#sendTelegramNotification(telegramPayload);
      historyRecord.results.telegram = telegramResult;
    }

    const shouldUseN8NFallback =
      !!this.n8nWebhookUrl &&
      (!telegramResult.sent || !(this.telegramToken && this.telegramChatId));

    if (shouldUseN8NFallback) {
      historyRecord.channels.push('n8n');
      n8nResult = await this.#triggerN8nWebhook(eventType, data, telegramPayload);
      historyRecord.results.n8n = n8nResult;
    }

    historyRecord.status = this.#determineStatus(historyRecord.results);
    await this.#saveNotificationHistory(historyRecord);

    return {
      sent: historyRecord.status === 'success' || historyRecord.status === 'partial',
      status: historyRecord.status,
      historyId: historyRecord.id,
      results: historyRecord.results,
    };
  }

  #checkRateLimit() {
    const now = Date.now();
    if (
      this.rateState.windowStartedAt === 0 ||
      now - this.rateState.windowStartedAt >= RATE_LIMIT_WINDOW_MS
    ) {
      this.rateState.windowStartedAt = now;
      this.rateState.count = 0;
    }

    if (this.rateState.count >= RATE_LIMIT_MAX_PER_MINUTE) {
      return {
        allowed: false,
        resetTime: this.rateState.windowStartedAt + RATE_LIMIT_WINDOW_MS,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      resetTime: this.rateState.windowStartedAt + RATE_LIMIT_WINDOW_MS,
      remaining: Math.max(0, RATE_LIMIT_MAX_PER_MINUTE - this.rateState.count),
    };
  }

  #recordMessageSent() {
    this.rateState.count += 1;
  }

  async #sendTelegramNotification(message = {}) {
    if (!this.telegramToken || !this.telegramChatId) {
      return { sent: false, reason: 'not_configured' };
    }

    const rateCheck = this.#checkRateLimit();
    if (!rateCheck.allowed) {
      return {
        sent: false,
        reason: 'rate_limited',
        resetTime: rateCheck.resetTime,
      };
    }

    const endpoint = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;

    const body = {
      chat_id: this.telegramChatId,
      parse_mode: message.parse_mode || 'HTML',
      disable_web_page_preview: true,
      text: formatNotificationText(message.text || message),
    };

    if (message.reply_markup) {
      body.reply_markup = message.reply_markup;
    }

    let lastError = null;
    let lastStatus = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          lastStatus = response.status;
          lastError = new Error(`HTTP ${response.status}: ${errorBody}`);

          if (attempt < RETRY_DELAYS_MS.length && isRetryableError(lastError, response.status)) {
            await sleep(RETRY_DELAYS_MS[attempt]);
            continue;
          }

          return {
            sent: false,
            reason: 'http_error',
            status: response.status,
            error: errorBody,
            attempts: attempt + 1,
          };
        }

        const json = await response.json();
        this.#recordMessageSent();

        return {
          sent: true,
          messageId: json?.result?.message_id,
          attempts: attempt + 1,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;

        if (attempt < RETRY_DELAYS_MS.length && isRetryableError(error, lastStatus)) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }

        return {
          sent: false,
          reason: error?.name === 'AbortError' ? 'timeout' : 'fetch_error',
          error: error?.message || String(error),
          attempts: attempt + 1,
        };
      }
    }

    return {
      sent: false,
      reason: 'max_retries_exceeded',
      status: lastStatus,
      error: lastError?.message || 'Unknown error',
      attempts: RETRY_DELAYS_MS.length + 1,
    };
  }

  async #triggerN8nWebhook(eventType, data, message) {
    if (!this.n8nWebhookUrl) {
      return { sent: false, reason: 'not_configured' };
    }

    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      source: this.source,
      data,
      telegram: {
        chatId: this.telegramChatId,
        text: message?.text || null,
        parseMode: message?.parse_mode || 'HTML',
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

    try {
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': this.source,
          'X-Event-Type': eventType,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          sent: false,
          reason: 'http_error',
          status: response.status,
          error: errorText,
        };
      }

      return { sent: true };
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        sent: false,
        reason: error?.name === 'AbortError' ? 'timeout' : 'network_error',
        error: error?.message,
      };
    }
  }

  async #saveNotificationHistory(record) {
    try {
      if (this.db?.prepare) {
        await this.db
          .prepare(
            `
            INSERT INTO notification_history (
              id, event_type, data, channels, timestamp, status, results
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `
          )
          .bind(
            record.id,
            record.eventType,
            JSON.stringify(record.data ?? {}),
            JSON.stringify(record.channels ?? []),
            record.timestamp,
            record.status,
            JSON.stringify(record.results ?? {})
          )
          .run();

        return { saved: true, backend: 'db_binding' };
      }

      if (typeof this.d1Client?.query === 'function') {
        await this.d1Client.query(
          `
            INSERT INTO notification_history (
              id, event_type, data, channels, timestamp, status, results
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            record.id,
            record.eventType,
            JSON.stringify(record.data ?? {}),
            JSON.stringify(record.channels ?? []),
            record.timestamp,
            record.status,
            JSON.stringify(record.results ?? {}),
          ]
        );

        return { saved: true, backend: 'd1_client' };
      }

      return { saved: false, reason: 'no_d1_backend' };
    } catch (error) {
      this.logger.error(
        '[TelegramNotificationAdapter] Failed to save notification history:',
        error?.message
      );
      return {
        saved: false,
        reason: 'save_failed',
        error: error?.message,
      };
    }
  }

  async #updateApprovalStatus(applicationId, status) {
    const normalized = status === 'approved' ? 'approved' : 'rejected';

    try {
      if (this.db?.prepare) {
        const timestampField = normalized === 'approved' ? 'approved_at' : 'rejected_at';

        await this.db
          .prepare(
            `
            UPDATE applications
            SET status = ?, ${timestampField} = datetime('now')
            WHERE id = ?
          `
          )
          .bind(normalized, applicationId)
          .run();

        return {
          success: true,
          message:
            normalized === 'approved'
              ? `✅ Application ${applicationId} approved.`
              : `❌ Application ${applicationId} rejected.`,
        };
      }

      if (
        typeof this.handlers?.[`on${normalized === 'approved' ? 'Approve' : 'Reject'}`] ===
        'function'
      ) {
        return await this.handlers[`on${normalized === 'approved' ? 'Approve' : 'Reject'}`](
          applicationId
        );
      }

      return {
        success: false,
        message: `No approval persistence backend configured for ${applicationId}.`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update application ${applicationId}: ${error?.message}`,
      };
    }
  }

  #determineStatus(results) {
    const values = Object.values(results || {});
    if (values.length === 0) return 'failed';

    const allSent = values.every((v) => v?.sent);
    const someSent = values.some((v) => v?.sent);

    if (allSent) return 'success';
    if (someSent) return 'partial';
    return 'failed';
  }
}

export function createTelegramNotificationAdapter(options = {}) {
  return new TelegramNotificationAdapter(options);
}

export default TelegramNotificationAdapter;

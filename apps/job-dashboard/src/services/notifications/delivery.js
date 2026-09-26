import { MAX_RETRIES, RETRY_DELAYS, TELEGRAM_TIMEOUT_MS, WEBHOOK_TIMEOUT_MS } from './constants.js';
import { formatNotificationText, sanitizeData } from './formatters.js';

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {{ name?: string, code?: string }} error
 * @param {number} [status]
 * @returns {boolean}
 */
function isRetryableError(error, status) {
  if (
    error.name === 'TypeError' ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNREFUSED'
  ) {
    return true;
  }

  if (status === 429 || /** @type {number} */ (status) >= 500) {
    return true;
  }

  return false;
}

/**
 * @typedef {Object} RateLimiterLike
 * @property {(chatId: string | number) => Promise<{ allowed: boolean, remaining: number, resetTime: number }>} checkLimit
 * @property {(chatId: string | number, count: number) => Promise<unknown>} consume
 */

/**
 * @typedef {Object} DeliveryServiceContext
 * @property {RateLimiterLike} [rateLimiter]
 * @property {string} [telegramToken]
 * @property {string | number} [telegramChatId]
 * @property {string} [automationWebhookUrl]
 */

/**
 * @param {{ rateLimiter: RateLimiterLike }} service
 * @param {string | number} chatId
 * @returns {Promise<{ allowed: boolean, remaining: number, resetTime: number }>}
 */
export async function checkRateLimit(service, chatId) {
  const result = await service.rateLimiter.checkLimit(chatId);
  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
  };
}

/**
 * @param {{ rateLimiter: RateLimiterLike }} service
 * @param {string | number} chatId
 * @returns {Promise<void>}
 */
export async function recordMessageSent(service, chatId) {
  await service.rateLimiter.consume(chatId, 1);
}

/**
 * @typedef {Object} TelegramNotificationOptions
 * @property {string} [parse_mode]
 * @property {string} [text]
 * @property {unknown} [reply_markup]
 */

/**
 * @param {{ telegramToken?: string, telegramChatId?: string | number, rateLimiter: RateLimiterLike }} service
 * @param {string | { text?: string, reply_markup?: unknown, [key: string]: unknown }} data
 * @param {TelegramNotificationOptions} [options]
 * @returns {Promise<{ sent: boolean, reason?: string, waitTime?: number, resetTime?: number, status?: number, error?: string, attempts?: number, messageId?: string | number }>}
 */
export async function sendTelegramNotification(service, data, options = {}) {
  if (!service.telegramToken || !service.telegramChatId) {
    console.log('[NotificationService] Telegram not configured');
    return { sent: false, reason: 'not_configured' };
  }

  const rateCheck = await checkRateLimit(service, service.telegramChatId);
  if (!rateCheck.allowed) {
    const waitTime = Math.max(0, (rateCheck.resetTime || Date.now()) - Date.now());
    console.warn(`[NotificationService] Rate limit exceeded. Wait ${waitTime}ms`);
    return { sent: false, reason: 'rate_limited', waitTime, resetTime: rateCheck.resetTime };
  }

  const endpoint = `https://api.telegram.org/bot${service.telegramToken}/sendMessage`;
  /** @type {{ chat_id: string | number | undefined, parse_mode: string, disable_web_page_preview: boolean, text?: string, reply_markup?: unknown }} */
  const body = {
    chat_id: service.telegramChatId,
    parse_mode: options.parse_mode || 'HTML',
    disable_web_page_preview: true,
  };

  if (options.text || typeof data === 'string') {
    body.text = formatNotificationText(options.text || data);
  } else if (data.text) {
    body.text = formatNotificationText(data.text);
  } else {
    body.text = formatNotificationText(data);
  }

  if (options.reply_markup || /** @type {Record<string, unknown>} */ (data).reply_markup) {
    body.reply_markup =
      options.reply_markup || /** @type {Record<string, unknown>} */ (data).reply_markup;
  }

  /** @type {Error | null} */
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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
        if (attempt < MAX_RETRIES && isRetryableError(new Error(errorBody), response.status)) {
          console.warn(
            `[NotificationService] Telegram error ${response.status}, retrying (${attempt + 1}/${MAX_RETRIES})...`
          );
          lastError = new Error(`HTTP ${response.status}: ${errorBody}`);
          await sleep(RETRY_DELAYS[attempt]);
          continue;
        }

        console.error('[NotificationService] Telegram error:', response.status, errorBody);
        return {
          sent: false,
          reason: 'http_error',
          status: response.status,
          error: errorBody,
          attempts: attempt + 1,
        };
      }

      const result = await response.json();
      await recordMessageSent(service, service.telegramChatId);
      return {
        sent: true,
        messageId: result.result?.message_id,
        attempts: attempt + 1,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = /** @type {Error} */ (error);

      if (attempt < MAX_RETRIES && isRetryableError(/** @type {Error} */ (error))) {
        console.warn(
          `[NotificationService] Telegram network error, retrying (${attempt + 1}/${MAX_RETRIES})...`
        );
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }

      console.error(
        '[NotificationService] Telegram error:',
        error instanceof Error ? error.message : String(error)
      );
      return {
        sent: false,
        reason: /** @type {Error} */ (error).name === 'AbortError' ? 'timeout' : 'fetch_error',
        error: error instanceof Error ? error.message : String(error),
        attempts: attempt + 1,
      };
    }
  }

  return {
    sent: false,
    reason: 'max_retries_exceeded',
    error: lastError?.message || 'Unknown error',
    attempts: MAX_RETRIES + 1,
  };
}

/**
 * @param {{ automationWebhookUrl?: string }} service
 * @param {string} event
 * @param {Record<string, unknown> | null | undefined} [data]
 * @returns {Promise<{ sent: boolean, reason?: string, status?: number, error?: string }>}
 */
export async function triggerAutomationWebhook(service, event, data) {
  if (!service.automationWebhookUrl) {
    console.log('[NotificationService] automation webhook not configured');
    return { sent: false, reason: 'not_configured' };
  }

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data: sanitizeData(data),
    source: 'job-dashboard',
    project: 'resume-monorepo',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(service.automationWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'job-dashboard',
        'X-Event-Type': event,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log(`[NotificationService] automation webhook sent: ${event}`);
      return { sent: true };
    }

    const errorText = await response.text();
    console.warn(`[NotificationService] automation webhook failed: ${response.status}`);
    return {
      sent: false,
      reason: 'http_error',
      status: response.status,
      error: errorText,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn(
      '[NotificationService] automation webhook error:',
      error instanceof Error ? error.message : String(error)
    );
    return {
      sent: false,
      reason: /** @type {Error} */ (error).name === 'AbortError' ? 'timeout' : 'network_error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param {{ telegramToken?: string }} service
 * @param {string} callbackQueryId
 * @param {string} [text]
 * @returns {Promise<void>}
 */
export async function answerCallbackQuery(service, callbackQueryId, text) {
  if (!service.telegramToken) return;

  const endpoint = `https://api.telegram.org/bot${service.telegramToken}/answerCallbackQuery`;

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (error) {
    console.error('[NotificationService] Answer callback error:', error);
  }
}

import { RETRY_DELAYS_MS, TELEGRAM_TIMEOUT_MS } from './constants.js';
import { formatNotificationText } from './formatters.js';
import {
  createNotificationHistoryRecord,
  determineNotificationStatus,
  saveNotificationHistory,
} from './history.js';
import { checkRateLimit, recordMessageSent } from './rate-limit.js';
import { triggerAutomationWebhook } from './webhook-delivery.js';

export { triggerAutomationWebhook } from './webhook-delivery.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export async function answerCallbackQuery(adapter, callbackQueryId, text) {
  if (!adapter.telegramToken || !callbackQueryId) {
    return { sent: false, reason: 'not_configured' };
  }

  const endpoint = `https://api.telegram.org/bot${adapter.telegramToken}/answerCallbackQuery`;

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
    adapter.logger.error(
      '[TelegramNotificationAdapter] answerCallbackQuery error:',
      error?.message
    );
    return {
      sent: false,
      reason: 'fetch_error',
      error: error?.message,
    };
  }
}

export async function sendTelegramNotification(adapter, message = {}) {
  if (!adapter.telegramToken || !adapter.telegramChatId) {
    return { sent: false, reason: 'not_configured' };
  }

  const rateCheck = checkRateLimit(adapter);
  if (!rateCheck.allowed) {
    return {
      sent: false,
      reason: 'rate_limited',
      resetTime: rateCheck.resetTime,
    };
  }

  const endpoint = `https://api.telegram.org/bot${adapter.telegramToken}/sendMessage`;
  const body = {
    chat_id: adapter.telegramChatId,
    parse_mode: message.parse_mode || 'HTML',
    disable_web_page_preview: true,
    text: formatNotificationText(message.text || message),
  };

  if (message.reply_markup) {
    body.reply_markup = message.reply_markup;
  }

  let lastError = null;
  let lastStatus = null;

  const doFetch = adapter.fetchImpl || fetch;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

    try {
      const response = await doFetch(endpoint, {
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
      recordMessageSent(adapter);

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

export async function notify(adapter, eventType, data, telegramPayload) {
  const historyRecord = createNotificationHistoryRecord(eventType, data);
  let telegramResult = { sent: false, reason: 'not_attempted' };
  let webhookResult;

  if (adapter.telegramToken && adapter.telegramChatId) {
    historyRecord.channels.push('telegram');
    telegramResult = await sendTelegramNotification(adapter, telegramPayload);
    historyRecord.results.telegram = telegramResult;
  }

  const shouldUseWebhookFallback =
    !!adapter.automationWebhookUrl &&
    (!telegramResult.sent || !(adapter.telegramToken && adapter.telegramChatId));

  if (shouldUseWebhookFallback) {
    historyRecord.channels.push('webhook');
    webhookResult = await triggerAutomationWebhook(adapter, eventType, data, telegramPayload);
    historyRecord.results.webhook = webhookResult;
  }

  historyRecord.status = determineNotificationStatus(historyRecord.results);
  await saveNotificationHistory(adapter, historyRecord);

  return {
    sent: historyRecord.status === 'success' || historyRecord.status === 'partial',
    status: historyRecord.status,
    historyId: historyRecord.id,
    results: historyRecord.results,
  };
}

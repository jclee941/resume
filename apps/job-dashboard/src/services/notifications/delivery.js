import { MAX_RETRIES, N8N_TIMEOUT_MS, RETRY_DELAYS, TELEGRAM_TIMEOUT_MS } from './constants.js';
import { formatNotificationText, sanitizeData } from './formatters.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error, status) {
  if (
    error.name === 'TypeError' ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNREFUSED'
  ) {
    return true;
  }

  if (status === 429 || status >= 500) {
    return true;
  }

  return false;
}

export async function checkRateLimit(service, chatId) {
  const result = await service.rateLimiter.checkLimit(chatId);
  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
  };
}

export async function recordMessageSent(service, chatId) {
  await service.rateLimiter.consume(chatId, 1);
}

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

  if (options.reply_markup || data.reply_markup) {
    body.reply_markup = options.reply_markup || data.reply_markup;
  }

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
      lastError = error;

      if (attempt < MAX_RETRIES && isRetryableError(error)) {
        console.warn(
          `[NotificationService] Telegram network error, retrying (${attempt + 1}/${MAX_RETRIES})...`
        );
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }

      console.error('[NotificationService] Telegram error:', error.message);
      return {
        sent: false,
        reason: error.name === 'AbortError' ? 'timeout' : 'fetch_error',
        error: error.message,
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

export async function triggerN8nWebhook(service, event, data) {
  if (!service.n8nWebhookUrl) {
    console.log('[NotificationService] n8n not configured');
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
  const timeoutId = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

  try {
    const response = await fetch(service.n8nWebhookUrl, {
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
      console.log(`[NotificationService] n8n webhook sent: ${event}`);
      return { sent: true };
    }

    const errorText = await response.text();
    console.warn(`[NotificationService] n8n webhook failed: ${response.status}`);
    return {
      sent: false,
      reason: 'http_error',
      status: response.status,
      error: errorText,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[NotificationService] n8n webhook error:', error.message);
    return {
      sent: false,
      reason: error.name === 'AbortError' ? 'timeout' : 'network_error',
      error: error.message,
    };
  }
}

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

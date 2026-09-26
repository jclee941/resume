import { WEBHOOK_TIMEOUT_MS } from './constants.js';

/**
 * @typedef {Object} WebhookAdapter
 * @property {string} [automationWebhookUrl]
 * @property {string} [source]
 * @property {string | number} [telegramChatId]
 */

/**
 * @typedef {Object} WebhookMessage
 * @property {string} [text]
 * @property {string} [parse_mode]
 */

/**
 * @param {WebhookAdapter} adapter
 * @param {string} eventType
 * @param {unknown} data
 * @param {WebhookMessage} [message]
 * @returns {Promise<{ sent: boolean, reason?: string, status?: number, error?: string }>}
 */
export async function triggerAutomationWebhook(adapter, eventType, data, message) {
  if (!adapter.automationWebhookUrl) {
    return { sent: false, reason: 'not_configured' };
  }

  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    source: adapter.source,
    data,
    telegram: {
      chatId: adapter.telegramChatId,
      text: message?.text || null,
      parseMode: message?.parse_mode || 'HTML',
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(adapter.automationWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': adapter.source ?? '',
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
    const isAbort = error instanceof Error && error.name === 'AbortError';
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      sent: false,
      reason: isAbort ? 'timeout' : 'network_error',
      error: errorMessage,
    };
  }
}

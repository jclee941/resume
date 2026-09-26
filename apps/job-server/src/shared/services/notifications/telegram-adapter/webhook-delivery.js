import { WEBHOOK_TIMEOUT_MS } from './constants.js';

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
        'X-Webhook-Source': adapter.source,
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

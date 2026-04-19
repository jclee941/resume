import { TELEGRAM_MAX_LENGTH } from './constants.js';

export function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatNotificationText(message) {
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

  const hasHtmlTags =
    /<(b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-spoiler|blockquote)[\s>]/i.test(text);
  const hasCallbackButtons = text.includes('callback_data');

  if (!hasHtmlTags && !hasCallbackButtons) {
    text = escapeHtml(text);
  }

  if (text.length > TELEGRAM_MAX_LENGTH) {
    text = `${text.slice(0, TELEGRAM_MAX_LENGTH - 20)}\n\n[...truncated]`;
  }

  return text;
}

export function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = ['password', 'token', 'cookie', 'secret', 'key', 'auth'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

export function determineStatus(results) {
  const values = Object.values(results);
  if (values.length === 0) return 'failed';

  const allSuccess = values.every((result) => result?.sent);
  const someSuccess = values.some((result) => result?.sent);

  if (allSuccess) return 'success';
  if (someSuccess) return 'partial';
  return 'failed';
}

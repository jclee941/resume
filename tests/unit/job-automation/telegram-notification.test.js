const { describe, test, expect, beforeEach } = require('@jest/globals');

// Replicate telegram.js logic inline for CJS Jest compatibility
// (source: apps/job-dashboard/src/services/notification/telegram.js)
const TELEGRAM_MAX_LENGTH = 4096;

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
        text = JSON.stringify(message);
      } catch {
        text = String(message);
      }
    }
  } else {
    text = String(message ?? '');
  }
  if (!
    /<\/?(b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-spoiler|blockquote)[\s>/]/i.test(text)
  ) {
    text = escapeHtml(text);
  }
  if (text.length > TELEGRAM_MAX_LENGTH) {
    text = `${text.slice(0, TELEGRAM_MAX_LENGTH - 20)  }\n\n[...truncated]`;
  }
  return text;
}

async function sendTelegramNotification(env, message) {
  const token = env?.TELEGRAM_BOT_TOKEN;
  const chatId = env?.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { sent: false, fallback: true, reason: 'missing_env' };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  const text = formatNotificationText(message);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      await response.text();
      return { sent: false, fallback: false, reason: 'http_error', status: response.status };
    }
    return { sent: true, fallback: false };
  } catch (error) {
    return {
      sent: false,
      fallback: false,
      reason: error?.name === 'AbortError' ? 'timeout' : 'fetch_error',
      error: error?.message || String(error),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Telegram Notification Service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('escapeHtml', () => {
    test('escapes ampersands', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    test('escapes angle brackets', () => {
      expect(escapeHtml('<script>alert(1)</script>')).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt;'
      );
    });

    test('handles text with no special characters', () => {
      expect(escapeHtml('plain text')).toBe('plain text');
    });

    test('escapes mixed special characters', () => {
      expect(escapeHtml('a > b & c < d')).toBe('a &gt; b &amp; c &lt; d');
    });
  });

  describe('formatNotificationText', () => {
    test('handles string messages', () => {
      expect(formatNotificationText('Hello World')).toBe('Hello World');
    });

    test('extracts text property from objects', () => {
      expect(formatNotificationText({ text: 'From object' })).toBe('From object');
    });

    test('JSON-stringifies objects without text property', () => {
      const result = formatNotificationText({ key: 'value' });
      expect(result).toContain('key');
      expect(result).toContain('value');
    });

    test('handles null and undefined', () => {
      expect(formatNotificationText(null)).toBe('');
      expect(formatNotificationText(undefined)).toBe('');
    });

    test('truncates messages over 4096 chars', () => {
      const longMsg = 'x'.repeat(5000);
      const result = formatNotificationText(longMsg);
      expect(result.length).toBeLessThanOrEqual(TELEGRAM_MAX_LENGTH);
      expect(result).toContain('[...truncated]');
    });

    test('preserves Telegram HTML tags', () => {
      const result = formatNotificationText('<b>bold</b> and <i>italic</i>');
      expect(result).toBe('<b>bold</b> and <i>italic</i>');
    });

    test('escapes non-Telegram HTML', () => {
      const result = formatNotificationText('<script>alert(1)</script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('sendTelegramNotification', () => {
    test('returns fallback when env is empty', async () => {
      const result = await sendTelegramNotification({}, 'test');
      expect(result).toEqual({ sent: false, fallback: true, reason: 'missing_env' });
    });

    test('returns fallback when env is null', async () => {
      const result = await sendTelegramNotification(null, 'test');
      expect(result).toEqual({ sent: false, fallback: true, reason: 'missing_env' });
    });

    test('sends message successfully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('{}') });

      const env = { TELEGRAM_BOT_TOKEN: 'tok123', TELEGRAM_CHAT_ID: '456' };
      const result = await sendTelegramNotification(env, 'Hello');

      expect(result).toEqual({ sent: true, fallback: false });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottok123/sendMessage',
        expect.objectContaining({ method: 'POST', body: expect.any(String) })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.chat_id).toBe('456');
      expect(body.text).toBe('Hello');
      expect(body.parse_mode).toBe('HTML');
      expect(body.disable_web_page_preview).toBe(true);
    });

    test('handles HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      });

      const env = { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '1' };
      const result = await sendTelegramNotification(env, 'test');

      expect(result.sent).toBe(false);
      expect(result.reason).toBe('http_error');
      expect(result.status).toBe(403);
    });

    test('handles fetch network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const env = { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '1' };
      const result = await sendTelegramNotification(env, 'test');

      expect(result.sent).toBe(false);
      expect(result.reason).toBe('fetch_error');
    });

    test('handles AbortError as timeout', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const env = { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '1' };
      const result = await sendTelegramNotification(env, 'test');

      expect(result.sent).toBe(false);
      expect(result.reason).toBe('timeout');
    });

    test('sends object messages with .text property', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('{}') });

      const env = { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '1' };
      await sendTelegramNotification(env, { text: 'Object msg' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toBe('Object msg');
    });

    test('JSON-stringifies non-text object messages', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('{}') });

      const env = { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '1' };
      await sendTelegramNotification(env, { key: 'value' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('key');
      expect(body.text).toContain('value');
    });

    test('truncates long messages to 4096 chars', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('{}') });

      const env = { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '1' };
      await sendTelegramNotification(env, 'a'.repeat(5000));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text.length).toBeLessThanOrEqual(4096);
      expect(body.text).toContain('[...truncated]');
    });

    test('handles null message', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('{}') });

      const env = { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '1' };
      await sendTelegramNotification(env, null);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toBe('');
    });

    test('preserves Telegram HTML formatting', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('{}') });

      const env = { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '1' };
      await sendTelegramNotification(env, '<b>Bold</b> and <code>code</code>');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toBe('<b>Bold</b> and <code>code</code>');
    });

    test('escapes non-Telegram HTML tags', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('{}') });

      const env = { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '1' };
      await sendTelegramNotification(env, '<script>alert("xss")</script>');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });
  });
});

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

  // Escape HTML entities unless message already contains intentional Telegram HTML tags
  if (!/<\/?(b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-spoiler|blockquote)[\s>/]/i.test(text)) {
    text = escapeHtml(text);
  }

  // Truncate to Telegram's 4096 char limit
  if (text.length > TELEGRAM_MAX_LENGTH) {
    text = text.slice(0, TELEGRAM_MAX_LENGTH - 20) + '\n\n[...truncated]';
  }

  return text;
}

export { escapeHtml };

export async function sendTelegramNotification(env, message) {
  console.log('[Notification]', JSON.stringify(message));

  const token = env?.TELEGRAM_BOT_TOKEN;
  const chatId = env?.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('[Notification:fallback]', JSON.stringify(message));
    return { sent: false, fallback: true, reason: 'missing_env' };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  const text = formatNotificationText(message);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Notification:error]', response.status, errorBody);
      return {
        sent: false,
        fallback: false,
        reason: 'http_error',
        status: response.status,
      };
    }

    return { sent: true, fallback: false };
  } catch (error) {
    console.error('[Notification:error]', error?.message || String(error));
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

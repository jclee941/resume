function formatNotificationText(message) {
  if (typeof message === 'string') {
    return message;
  }

  if (message && typeof message === 'object') {
    if (typeof message.text === 'string') {
      return message.text;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  return String(message ?? '');
}

export async function sendEvolutionNotification(env, message) {
  console.log('[Notification]', JSON.stringify(message));

  const url = env?.EVOLUTION_API_URL;
  const apiKey = env?.EVOLUTION_API_KEY;
  const instance = env?.EVOLUTION_INSTANCE_NAME;
  const number = env?.EVOLUTION_WHATSAPP_NUMBER;

  if (!url || !apiKey || !instance || !number) {
    console.log('[Notification:fallback]', JSON.stringify(message));
    return { sent: false, fallback: true, reason: 'missing_env' };
  }

  const endpoint = `${url.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(instance)}`;
  const text = formatNotificationText(message);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number,
        text,
      }),
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
      reason: 'fetch_error',
      error: error?.message || String(error),
    };
  }
}

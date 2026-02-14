const logger = require('../logger');

/**
 * Log to Grafana Loki (fire-and-forget)
 * @param {Object} env - Cloudflare Worker environment bindings
 * @param {string} message
 * @param {string} [level='INFO']
 * @param {Object} [labels={}]
 */
async function logToLoki(env, message, level = 'INFO', labels = {}) {
  try {
    const lokiUrl =
      env?.LOKI_URL ||
      'https://grafana.jclee.me/api/datasources/proxy/uid/cfakfiakcs0zka/loki/api/v1/push';
    const apiKey = env?.LOKI_API_KEY || '';

    if (!apiKey) {
      return; // Skip if no API key configured
    }

    const timestamp = (Date.now() * 1000000).toString();

    const payload = {
      streams: [
        {
          stream: {
            job: 'resume-worker',
            level,
            ...labels,
          },
          values: [[timestamp, message]],
        },
      ],
    };

    // Await the fetch so ctx.waitUntil can track it
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      await fetch(lokiUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.warn('Loki log request timed out');
      } else {
        logger.error('Loki log failed:', err.message);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    logger.error('Loki logging error:', err.message);
  }
}

module.exports = { logToLoki };

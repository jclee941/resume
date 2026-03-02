/**
 * Loki Logger for Job Dashboard Worker
 * Sends logs to Grafana Loki (fire-and-forget pattern)
 */

const DEFAULT_LOKI_URL =
  'https://grafana.jclee.me/api/datasources/proxy/uid/cfakfiakcs0zka/loki/api/v1/push';
const JOB_NAME = 'job-worker';

/**
 * Log to Grafana Loki (fire-and-forget)
 * @param {Object} env - Cloudflare Worker environment bindings
 * @param {string} message - Log message
 * @param {string} [level='INFO'] - Log level (INFO, WARN, ERROR, DEBUG)
 * @param {Object} [labels={}] - Additional labels
 */
export async function logToLoki(env, message, level = 'INFO', labels = {}) {
  try {
    const lokiUrl = env?.LOKI_URL || DEFAULT_LOKI_URL;
    const apiKey = env?.LOKI_API_KEY || '';

    if (!apiKey) {
      return; // Skip if no API key configured
    }

    const timestamp = (Date.now() * 1000000).toString();

    const payload = {
      streams: [
        {
          stream: {
            job: JOB_NAME,
            level,
            ...labels,
          },
          values: [[timestamp, message]],
        },
      ],
    };

    // Await the fetch so ctx.waitUntil can track it
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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
    } catch {
      // Silently ignore Loki errors - don't impact main request
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    // Silently ignore - logging should never break the application
  }
}

/**
 * Log request info
 * @param {Object} env
 * @param {Request} request
 * @param {URL} url
 * @returns {Promise<void>}
 */
export async function logRequest(env, request, url) {
  return logToLoki(env, `Request: ${request.method} ${url.pathname}`, 'INFO', {
    path: url.pathname,
    method: request.method,
  });
}

/**
 * Log error
 * @param {Object} env
 * @param {Error} error
 * @param {Object} [context={}]
 * @returns {Promise<void>}
 */
export async function logError(env, error, context = {}) {
  return logToLoki(env, `Error: ${error.message}`, 'ERROR', {
    stack: error.stack?.substring(0, 500),
    ...context,
  });
}

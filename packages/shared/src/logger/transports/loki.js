/**
 * Grafana Loki transport for the canonical logger.
 *
 * SSOT-038 — pluggable transport. Sends log entries to Grafana Loki using the
 * push API. Fire-and-forget: failures are swallowed so logging never breaks
 * the caller.
 *
 * Transport is a silent no-op when LOKI_API_KEY is missing in env (mirrors the
 * existing apps/job-dashboard/src/utils/loki-logger.js contract).
 *
 * Environment variables (read from `entry.env`):
 *   - LOKI_URL: full push endpoint URL (default: Grafana proxy URL).
 *   - LOKI_API_KEY: bearer token. Required.
 */

const DEFAULT_LOKI_URL =
  'https://grafana.jclee.me/api/datasources/proxy/uid/cfakfiakcs0zka/loki/api/v1/push';
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Create a Loki transport.
 * @param {Object} [options]
 * @param {number} [options.timeoutMs]
 * @returns {{name: string, send: Function}}
 */
export function createLokiTransport(options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  return {
    name: 'loki',

    /**
     * Send one log entry to Loki. Fire-and-forget on transport errors.
     * @param {Object} entry
     * @param {string} entry.level
     * @param {string} entry.message
     * @param {string} entry.service
     * @param {Object} entry.labels
     * @param {Object} entry.env
     */
    async send(entry) {
      const env = entry.env || {};
      const apiKey = env.LOKI_API_KEY;
      if (!apiKey) return; // Silent no-op when no auth configured.

      const lokiUrl = env.LOKI_URL || DEFAULT_LOKI_URL;
      const timestamp = (Date.now() * 1_000_000).toString(); // nanoseconds

      const stream = flattenLabelsForLoki(entry.labels || {});
      stream.job = entry.service || stream.job || 'default';
      stream.level = entry.level;

      const payload = {
        streams: [
          {
            stream,
            values: [[timestamp, entry.message]],
          },
        ],
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
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
        // Silently ignore — logging should never break the application.
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}

/**
 * Loki stream labels must be a flat string→string map. Recursively flatten
 * nested label objects (e.g. `http.request.method`) into dotted keys and drop
 * non-stringifiable values.
 * @param {Object} labels
 * @param {string} [prefix]
 * @returns {Record<string, string>}
 */
function flattenLabelsForLoki(labels, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(labels)) {
    if (value === null || value === undefined) continue;
    const flatKey = prefix ? `${prefix}_${key}` : key;
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenLabelsForLoki(value, flatKey));
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      out[flatKey] = String(value);
    }
    // Skip arrays and other non-scalars — Loki only accepts scalar labels.
  }
  return out;
}

export default createLokiTransport;

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * @typedef {typeof globalThis & { __esLogTotal?: number; __esLogFailures?: number }} GlobalWithEsCounters
 */

/**
 * @typedef {Object} EsLoggerEnv
 * @property {string} [CF_ACCESS_CLIENT_ID]
 * @property {string} [CF_ACCESS_CLIENT_SECRET]
 * @property {string} [ELASTICSEARCH_API_KEY]
 * @property {string} [ELASTICSEARCH_INDEX]
 * @property {string} [ELASTICSEARCH_URL]
 */

/**
 * @typedef {Record<string, unknown> & {
 *   traceparent?: string | null;
 *   tracestate?: string | null;
 *   traceId?: string | null;
 *   correlationId?: string | null;
 * }} EsLogLabels
 */

/**
 * @typedef {Object} EsLogOptions
 * @property {string} [index]
 * @property {{ headers?: { get?(name: string): string | null } }} [request]
 * @property {number} [timeout]
 * @property {boolean} [immediate]
 * @property {string} [requestId]
 * @property {number} [startTime]
 */

function generateRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @param {string} message
 * @param {string} level
 * @param {Record<string, unknown>} labels
 * @param {string} job
 * @returns {Record<string, unknown>}
 */
function buildDocument(message, level, labels, job) {
  const now = new Date();
  const normalizedLevel = level.toLowerCase();
  return {
    '@timestamp': now.toISOString(),
    message,
    level: normalizedLevel,
    log: { level: normalizedLevel },
    service: { name: job },
    serviceName: job,
    ecs: { version: '8.11' },
    ...labels,
  };
}

/**
 * @param {EsLoggerEnv | null | undefined} env
 * @returns {Record<string, string>}
 */
function buildEsHeaders(env) {
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'application/x-ndjson' };
  const cfId = env?.CF_ACCESS_CLIENT_ID;
  const cfSecret = env?.CF_ACCESS_CLIENT_SECRET;
  if (cfId) headers['CF-Access-Client-Id'] = cfId;
  if (cfSecret) headers['CF-Access-Client-Secret'] = cfSecret;
  const apiKey = env?.ELASTICSEARCH_API_KEY;
  if (apiKey) headers['Authorization'] = `ApiKey ${apiKey}`;
  return headers;
}

/**
 * @param {EsLoggerEnv | null | undefined} env
 * @param {string} message
 * @param {string} [level='INFO']
 * @param {EsLogLabels} [labels={}]
 * @param {EsLogOptions} [options={}]
 * @returns {Promise<void>}
 */
async function logToElasticsearch(env, message, level = 'INFO', labels = {}, options = {}) {
  try {
    const job = 'resume-worker';
    const index = options.index || env?.ELASTICSEARCH_INDEX || 'resume-logs-worker';

    const requestHeaders = options.request?.headers;
    const headerTraceparent =
      requestHeaders && requestHeaders.get ? requestHeaders.get('traceparent') : null;
    const headerTracestate =
      requestHeaders && requestHeaders.get ? requestHeaders.get('tracestate') : null;

    const traceparent =
      typeof labels.traceparent === 'string' && labels.traceparent
        ? labels.traceparent
        : headerTraceparent || null;
    const tracestate =
      typeof labels.tracestate === 'string' && labels.tracestate
        ? labels.tracestate
        : headerTracestate || null;

    let traceIdFromParent = null;
    if (traceparent) {
      const parts = String(traceparent).trim().split('-');
      if (parts.length === 4 && /^[0-9a-f]{32}$/i.test(parts[1])) {
        traceIdFromParent = parts[1].toLowerCase();
      }
    }

    const explicitTraceId =
      typeof labels.traceId === 'string' && labels.traceId ? labels.traceId.toLowerCase() : null;
    const explicitCorrelationId =
      typeof labels.correlationId === 'string' && labels.correlationId
        ? labels.correlationId.toLowerCase()
        : null;
    const traceId = explicitTraceId || traceIdFromParent || explicitCorrelationId || null;

    const enrichedLabels = {
      ...labels,
      ...(traceId ? { traceId, correlationId: labels.correlationId || traceId } : {}),
      ...(traceparent ? { traceparent } : {}),
      ...(tracestate ? { tracestate } : {}),
      ...(traceId ? { trace: { id: traceId } } : {}),
    };

    const doc = buildDocument(message, level, enrichedLabels, job);

    // Always use immediate mode — batch/setTimeout is unreliable in Cloudflare Workers
    const esUrl = env?.ELASTICSEARCH_URL;
    const apiKey = env?.ELASTICSEARCH_API_KEY;
    if (!esUrl || !apiKey) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT_MS);

    try {
      await fetch(`${esUrl}/${index}/_doc`, {
        method: 'POST',
        signal: controller.signal,
        headers: { ...buildEsHeaders(env), 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      // Tech-debt audit: track total successful ES writes for success-rate visibility.
      try {
        /** @type {GlobalWithEsCounters} */ (globalThis).__esLogTotal =
          /** @type {number} */ (
            /** @type {GlobalWithEsCounters} */ (globalThis).__esLogTotal || 0
          ) + 1;
      } catch {
        // best-effort: success counters must never break logging
      }
    } catch (err) {
      // P2-19: bump a global counter so /metrics exposes
      // `es_log_failures_total` for Grafana alerting on sustained logging-
      // pipeline outage. Best-effort — ignore failures (frozen global).
      try {
        /** @type {GlobalWithEsCounters} */ (globalThis).__esLogFailures =
          /** @type {number} */ (
            /** @type {GlobalWithEsCounters} */ (globalThis).__esLogFailures || 0
          ) + 1;
      } catch {
        // best-effort: failure counters must never break logging
      }
      console.error('[ES] Log failed:', err instanceof Error ? err.message : String(err));
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (outerErr) {
    // Never-reject guarantee: logToElasticsearch must not throw
    console.error(
      '[ES] logToElasticsearch failed:',
      /** @type {{ message?: string }} */ (outerErr).message || outerErr
    );
  }
}

/**
 * @param {EsLoggerEnv | null | undefined} env
 * @param {{ method: string; url: string }} request
 * @param {{ status: number }} response
 * @param {EsLogOptions} [options={}]
 * @returns {Promise<void>}
 */
async function logResponse(env, request, response, options = {}) {
  const requestId = options.requestId || generateRequestId();
  const startTime = options.startTime || Date.now();
  const durationMs = Date.now() - startTime;

  return logToElasticsearch(
    env,
    `${request.method} ${response.status} ${durationMs}ms`,
    response.status >= 400 ? 'ERROR' : 'INFO',
    {
      correlationId: requestId,
      route: new URL(request.url).pathname,
      statusCode: response.status,
      duration: durationMs,
    },
    { ...options, immediate: true }
  );
}

module.exports = {
  logToElasticsearch,
  logResponse,
  generateRequestId,
};

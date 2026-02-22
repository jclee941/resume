const DEFAULT_TIMEOUT_MS = 5000;

function generateRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildDocument(message, level, labels, job) {
  const now = new Date();
  return {
    '@timestamp': now.toISOString(),
    message,
    level: level.toLowerCase(),
    service: job,
    ...labels,
  };
}

function buildEsHeaders(env) {
  const headers = { 'Content-Type': 'application/x-ndjson' };
  const cfId = env?.CF_ACCESS_CLIENT_ID;
  const cfSecret = env?.CF_ACCESS_CLIENT_SECRET;
  if (cfId) headers['CF-Access-Client-Id'] = cfId;
  if (cfSecret) headers['CF-Access-Client-Secret'] = cfSecret;
  const apiKey = env?.ELASTICSEARCH_API_KEY;
  if (apiKey) headers['Authorization'] = `ApiKey ${apiKey}`;
  return headers;
}

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
    } catch (err) {
      console.error('[ES] Log failed:', err.message);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (outerErr) {
    // Never-reject guarantee: logToElasticsearch must not throw
    console.error('[ES] logToElasticsearch failed:', outerErr.message || outerErr);
  }
}

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

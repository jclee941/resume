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
    const doc = buildDocument(message, level, labels, job);

    // Always use immediate mode — batch/setTimeout is unreliable in Cloudflare Workers
    const esUrl = env?.ELASTICSEARCH_URL;
    const cfId = env?.CF_ACCESS_CLIENT_ID;
    if (!esUrl || !cfId) return;

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

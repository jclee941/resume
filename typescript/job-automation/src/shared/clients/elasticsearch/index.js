/**
 * Elasticsearch Logger for Cloudflare Workers
 * Enhanced with batching, ECS format, request timing, and distributed tracing
 *
 * Environment variables:
 * - ELASTICSEARCH_URL: Elasticsearch endpoint
 * - ELASTICSEARCH_API_KEY: API key for authentication
 * - ELASTICSEARCH_INDEX: Index name (default: logs-{job})
 */

const DEFAULT_TIMEOUT_MS = 5000;
const BATCH_SIZE = 10;
const BATCH_FLUSH_MS = 1000;
const MAX_QUEUE_SIZE = 1000;

let logQueue = [];
let flushTimer = null;

function generateRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildEcsDocument(message, level, labels, job) {
  const now = new Date();
  return {
    '@timestamp': now.toISOString(),
    message,
    log: { level: level.toLowerCase() },
    service: { name: job },
    ecs: { version: '8.11' },
    ...labels,
  };
}

async function flushLogs(env, index) {
  if (logQueue.length === 0) return;

  const logs = logQueue.splice(0, logQueue.length);
  const esUrl = env?.ELASTICSEARCH_URL;
  const apiKey = env?.ELASTICSEARCH_API_KEY;

  if (!esUrl || !apiKey) return;

  const bulkBody =
    logs
      .map((doc) => {
        const action = JSON.stringify({ index: { _index: index } });
        const document = JSON.stringify(doc);
        return `${action}\n${document}`;
      })
      .join('\n') + '\n';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    await fetch(`${esUrl}/_bulk`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-ndjson',
        Authorization: `ApiKey ${apiKey}`,
      },
      body: bulkBody,
    });
  } catch {
    // Silent fail
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function logToElasticsearch(env, message, level = 'INFO', labels = {}, options = {}) {
  const job = options.job || labels.job || 'default';
  const index = options.index || env?.ELASTICSEARCH_INDEX || `logs-${job}`;
  const doc = buildEcsDocument(message, level, labels, job);

  if (options.immediate) {
    const esUrl = env?.ELASTICSEARCH_URL;
    const apiKey = env?.ELASTICSEARCH_API_KEY;
    if (!esUrl || !apiKey) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT_MS);

    try {
      await fetch(`${esUrl}/${index}/_doc`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey ${apiKey}`,
        },
        body: JSON.stringify(doc),
      });
    } catch {
      // Silent fail
    } finally {
      clearTimeout(timeoutId);
    }
    return;
  }

  logQueue.push(doc);

  // Prevent unbounded memory growth if ES is unreachable
  if (logQueue.length > MAX_QUEUE_SIZE) {
    logQueue.splice(0, logQueue.length - MAX_QUEUE_SIZE);
  }

  if (logQueue.length >= BATCH_SIZE) {
    await flushLogs(env, index);
  } else if (!flushTimer) {
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flushLogs(env, index);
    }, BATCH_FLUSH_MS);
  }
}

export async function logRequest(env, request, url, options = {}) {
  const requestId = options.requestId || generateRequestId();
  const startTime = options.startTime || Date.now();

  return logToElasticsearch(
    env,
    `${request.method} ${url.pathname}`,
    'INFO',
    {
      http: {
        request: {
          method: request.method,
          id: requestId,
        },
      },
      url: {
        path: url.pathname,
        query: url.search || undefined,
      },
      user_agent: { original: request.headers.get('user-agent') },
      client: request.cf
        ? {
            geo: {
              country_iso_code: request.cf.country,
              city_name: request.cf.city,
            },
            as: { number: request.cf.asn },
          }
        : undefined,
      event: {
        start: new Date(startTime).toISOString(),
        kind: 'event',
        category: ['web'],
        type: ['access'],
      },
    },
    options
  );
}

export async function logResponse(env, request, response, options = {}) {
  const requestId = options.requestId || generateRequestId();
  const startTime = options.startTime || Date.now();
  const duration = Date.now() - startTime;

  return logToElasticsearch(
    env,
    `${request.method} ${response.status} ${duration}ms`,
    response.status >= 400 ? 'ERROR' : 'INFO',
    {
      http: {
        request: { method: request.method, id: requestId },
        response: { status_code: response.status },
      },
      event: {
        duration: duration * 1_000_000, // nanoseconds per ECS
        outcome: response.status < 400 ? 'success' : 'failure',
      },
    },
    { ...options, immediate: true }
  );
}

export async function logError(env, error, context = {}, options = {}) {
  return logToElasticsearch(
    env,
    error.message,
    'ERROR',
    {
      error: {
        type: error.name,
        message: error.message,
        stack_trace: error.stack?.substring(0, 2000),
      },
      event: { kind: 'event', category: ['web'], type: ['error'] },
      ...context,
    },
    { ...options, immediate: true }
  );
}

export async function logEvent(env, event, data = {}, options = {}) {
  return logToElasticsearch(
    env,
    event,
    'INFO',
    {
      event: { action: event, kind: 'event' },
      ...data,
    },
    options
  );
}

export async function flush(env, options = {}) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const job = options.job || 'default';
  const index = options.index || env?.ELASTICSEARCH_INDEX || `logs-${job}`;
  await flushLogs(env, index);
}

export default {
  logToElasticsearch,
  logRequest,
  logResponse,
  logError,
  logEvent,
  flush,
  generateRequestId,
};

const logger = require('../logger');

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
  } catch (err) {
    logger.warn('ES bulk flush failed:', err.message);
    // Fallback: attempt console.error for observability when ES is unreachable
    try {
      console.error('[ES] Bulk flush failed:', err.message, `(${logs.length} logs lost)`);
    } catch {}
  } finally {
    clearTimeout(timeoutId);
  }
}

async function logToElasticsearch(env, message, level = 'INFO', labels = {}, options = {}) {
  try {
    const job = 'resume-worker';
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
      } catch (err) {
        logger.warn('ES log failed:', err.message);
        console.error('[ES] Immediate log failed:', err.message);
      } finally {
        clearTimeout(timeoutId);
      }
      return;
    }

    // Prevent unbounded memory growth if ES is unreachable
    if (logQueue.length >= MAX_QUEUE_SIZE) {
      logQueue.splice(0, logQueue.length - MAX_QUEUE_SIZE + 1);
    }

    logQueue.push(doc);

    if (logQueue.length >= BATCH_SIZE) {
      await flushLogs(env, index);
    } else if (!flushTimer) {
      flushTimer = setTimeout(async () => {
        flushTimer = null;
        await flushLogs(env, index);
      }, BATCH_FLUSH_MS);
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
      http: {
        request: { method: request.method, id: requestId },
        response: { status_code: response.status },
      },
      event: {
        duration: durationMs * 1_000_000,
        outcome: response.status < 400 ? 'success' : 'failure',
      },
    },
    { ...options, immediate: true }
  );
}

async function flush(env, options = {}) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const index = options.index || env?.ELASTICSEARCH_INDEX || 'logs-resume-worker';
  await flushLogs(env, index);
}

module.exports = {
  logToElasticsearch,
  logResponse,
  flush,
  generateRequestId,
};

import { normalizeError } from '../../errors/index.js';

const DEFAULT_TIMEOUT_MS = 5000;
const BATCH_SIZE = 10;
const BATCH_FLUSH_MS = 1000;
const MAX_QUEUE_SIZE = 1000;

const logQueue = [];
let flushTimer = null;

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

function buildHeaders(env, contentType = 'application/json') {
  const headers = { 'Content-Type': contentType };
  const cfId = env?.CF_ACCESS_CLIENT_ID;
  const cfSecret = env?.CF_ACCESS_CLIENT_SECRET;
  if (cfId) headers['CF-Access-Client-Id'] = cfId;
  if (cfSecret) headers['CF-Access-Client-Secret'] = cfSecret;
  const apiKey = env?.ELASTICSEARCH_API_KEY;
  if (apiKey) headers['Authorization'] = `ApiKey ${apiKey}`;
  return headers;
}

async function flushLogs(env, index) {
  if (logQueue.length === 0) return;

  const logs = logQueue.splice(0, logQueue.length);
  const esUrl = env?.ELASTICSEARCH_URL;
  const apiKey = env?.ELASTICSEARCH_API_KEY;

  if (!esUrl || !apiKey) return;

  const bulkBody = `${logs
    .map((doc) => {
      const action = JSON.stringify({ index: { _index: index } });
      const document = JSON.stringify(doc);
      return `${action}\n${document}`;
    })
    .join('\n')}\n`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    await fetch(`${esUrl}/_bulk`, {
      method: 'POST',
      signal: controller.signal,
      headers: buildHeaders(env, 'application/x-ndjson'),
      body: bulkBody,
    });
  } catch (error) {
    const normalized = normalizeError(error, {
      client: 'elasticsearch',
      operation: 'flushLogs',
      index,
    });
    console.warn('[ES] Bulk flush failed:', normalized.toJSON());
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
        headers: buildHeaders(env),
        body: JSON.stringify(doc),
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        client: 'elasticsearch',
        operation: 'logToElasticsearch',
        index,
        immediate: true,
      });
      console.warn('[ES] Immediate log failed:', normalized.toJSON());
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

export async function flush(env, options = {}) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const job = options.job || 'default';
  const index = options.index || env?.ELASTICSEARCH_INDEX || `logs-${job}`;
  await flushLogs(env, index);
}

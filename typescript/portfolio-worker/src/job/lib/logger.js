const BATCH_SIZE = 10;
const BATCH_FLUSH_MS = 1000;
const DEFAULT_TIMEOUT_MS = 5000;

let logQueue = [];
let flushTimer = null;

/**
 * @returns {string} Unique request identifier
 */
export function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildEcsDocument(message, level, labels = {}) {
  return {
    '@timestamp': new Date().toISOString(),
    'log.level': level,
    message,
    'service.name': 'resume-worker',
    'ecs.version': '8.11',
    labels,
  };
}

async function sendToElasticsearch(env, documents) {
  if (!env?.ELASTICSEARCH_URL || !env?.ELASTICSEARCH_API_KEY || documents.length === 0) return;
  const body =
    documents
      .flatMap((doc) => [JSON.stringify({ index: { _index: 'resume-logs' } }), JSON.stringify(doc)])
      .join('\n') + '\n';
  try {
    await fetch(`${env.ELASTICSEARCH_URL}/_bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
        Authorization: `ApiKey ${env.ELASTICSEARCH_API_KEY}`,
      },
      body,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch {
    // Silent — logging failures must never break request handling
  }
}

async function logToEs(env, message, level, labels = {}) {
  const doc = buildEcsDocument(message, level, labels);
  logQueue.push(doc);
  if (logQueue.length >= BATCH_SIZE) {
    const batch = logQueue.splice(0);
    await sendToElasticsearch(env, batch);
  } else if (!flushTimer) {
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      const batch = logQueue.splice(0);
      await sendToElasticsearch(env, batch);
    }, BATCH_FLUSH_MS);
  }
}

async function flushLogs(env) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const batch = logQueue.splice(0);
  await sendToElasticsearch(env, batch);
}

export class RequestContext {
  constructor(requestId, method, pathname, startTime) {
    this.requestId = requestId;
    this.method = method;
    this.pathname = pathname;
    this.startTime = startTime;
  }

  static fromRequest(request, url) {
    return new RequestContext(generateRequestId(), request.method, url.pathname, Date.now());
  }

  get elapsed() {
    return Date.now() - this.startTime;
  }

  toLabels() {
    return {
      'http.request.method': this.method,
      'url.path': this.pathname,
      'trace.id': this.requestId,
    };
  }
}

class Logger {
  constructor(env, context = {}) {
    this.env = env;
    this.context = context;
    this.reqCtx = null;
  }

  static create(env, options = {}) {
    return new Logger(env, options.context || {});
  }

  withRequest(reqCtx) {
    this.reqCtx = reqCtx;
    return this;
  }

  _labels(extra = {}) {
    return { ...this.context, ...(this.reqCtx?.toLabels() || {}), ...extra };
  }

  info(message, extra = {}) {
    logToEs(this.env, message, 'info', this._labels(extra)).catch(() => {});
  }

  warn(message, extra = {}) {
    logToEs(this.env, message, 'warn', this._labels(extra)).catch(() => {});
  }

  error(message, errorOrExtra = {}) {
    const labels = this._labels();
    if (errorOrExtra instanceof Error) {
      const errorLabels = {
        ...labels,
        'error.type': errorOrExtra.name,
        'error.message': errorOrExtra.message,
        'error.stack_trace': (errorOrExtra.stack || '').slice(0, 2000),
      };
      logToEs(this.env, message, 'error', errorLabels).catch(() => {});
      console.error(`[ERROR] ${message}:`, errorOrExtra.message);
    } else {
      logToEs(this.env, message, 'error', { ...labels, ...errorOrExtra }).catch(() => {});
      console.error(`[ERROR] ${message}`);
    }
  }

  logRequest(request, url) {
    const labels = {
      ...this._labels(),
      'http.request.method': request.method,
      'url.full': url.toString(),
      'url.path': url.pathname,
    };
    logToEs(this.env, `${request.method} ${url.pathname}`, 'info', labels).catch(() => {});
  }

  flush() {
    return flushLogs(this.env);
  }
}

export default Logger;

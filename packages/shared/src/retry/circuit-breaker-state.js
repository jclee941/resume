const CIRCUIT_STATE = new Map(),
  RETRY_METRICS = new Map();

export function getCircuitState(key) {
  if (!CIRCUIT_STATE.has(key)) {
    CIRCUIT_STATE.set(key, {
      state: 'closed',
      consecutiveFailures: 0,
      openedAt: null,
      openUntil: null,
    });
  }
  return CIRCUIT_STATE.get(key);
}

export function getMetricState(key) {
  if (!RETRY_METRICS.has(key)) {
    RETRY_METRICS.set(key, {
      executions: 0,
      successes: 0,
      failures: 0,
      retryAttempts: 0,
      successAfterRetry: 0,
      lastUpdatedAt: null,
    });
  }
  return RETRY_METRICS.get(key);
}

export function defaultLog(logger, key, message, payload = {}) {
  const target = logger && typeof logger.info === 'function' ? logger : console;
  target.info(`[circuit:${key}] ${message}`, payload);
}

export function errorPayload(error) {
  return typeof error?.toJSON === 'function'
    ? error.toJSON()
    : { name: error?.name, message: error?.message };
}

export function emitReport(reporter, event, payload) {
  if (typeof reporter === 'function') {
    reporter(event, payload);
  }
}

export function openCircuit(circuit, key, options) {
  const { now, duration, logger, reporter, consecutiveFailures } = options;
  circuit.state = 'open';
  circuit.openedAt = now();
  circuit.openUntil = now() + duration;
  defaultLog(logger, key, 'Circuit opened', { openUntil: circuit.openUntil, consecutiveFailures });
  emitReport(reporter, 'circuit_opened', {
    key,
    openUntil: circuit.openUntil,
    consecutiveFailures,
  });
}

export function getRetryMetrics(key = null) {
  if (key) {
    const metric = RETRY_METRICS.get(key);
    if (!metric) {
      return null;
    }
    const successRate = metric.executions > 0 ? metric.successes / metric.executions : 0;
    return { key, ...metric, successRate };
  }

  return [...RETRY_METRICS.entries()].reduce((acc, [k, v]) => {
    const successRate = v.executions > 0 ? v.successes / v.executions : 0;
    acc[k] = { ...v, successRate };
    return acc;
  }, {});
}

export function resetRetryState(key = null) {
  if (key) {
    CIRCUIT_STATE.delete(key);
    RETRY_METRICS.delete(key);
    return;
  }
  CIRCUIT_STATE.clear();
  RETRY_METRICS.clear();
}

export function classifyApplyErrorFallback(error, key) {
  if (error?.retryable !== undefined) return error;
  const message = String(error?.message || error || 'Unknown apply error');
  const status = Number(error?.statusCode || error?.status || error?.response?.status || 0);
  const lowered = message.toLowerCase();
  const retryable =
    status >= 500 ||
    status === 429 ||
    error?.name === 'AbortError' ||
    /(timeout|timed\s+out|network|econnreset|econnrefused|etimedout|enotfound|failed\s+to\s+fetch|navigation\s+timeout)/i.test(
      lowered
    );
  return Object.assign(error instanceof Error ? error : new Error(message), {
    name: retryable ? 'NetworkError' : 'ValidationError',
    platform: key,
    retryable,
    retryAfterMs: Number(error?.retryAfterMs || error?.retryAfter || 0) || null,
  });
}

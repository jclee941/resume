const CIRCUIT_STATE = new Map();
const RETRY_METRICS = new Map();

function getCircuitState(key) {
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

function getMetricState(key) {
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

function calculateDelay(retryAttempt, options) {
  const { baseDelay, maxDelay, random, jitterMax } = options;
  const exponential = baseDelay * 2 ** retryAttempt;
  const jitter = Math.floor((random?.() ?? Math.random()) * jitterMax);
  return Math.min(maxDelay, exponential + jitter);
}

function defaultLog(logger, key, message, payload = {}) {
  const target = logger && typeof logger.info === 'function' ? logger : console;
  target.info(`[circuit:${key}] ${message}`, payload);
}

function emitReport(reporter, event, payload) {
  if (typeof reporter === 'function') {
    reporter(event, payload);
  }
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

export async function withCircuitBreaker(fn, options = {}) {
  const {
    key = 'unknown',
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitterMax = 1000,
    circuitBreakerThreshold = 3,
    circuitBreakerDuration = 5 * 60 * 1000,
    classifyError = (e) => e,
    shouldRetry = () => true,
    onCircuitOpen = null,
    logger = console,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    reporter = null,
    now = () => Date.now(),
    random = Math.random,
  } = options;

  const circuit = getCircuitState(key);
  const metrics = getMetricState(key);
  const startTime = now();

  if (circuit.state === 'open') {
    if (circuit.openUntil && now() < circuit.openUntil) {
      const error = onCircuitOpen
        ? onCircuitOpen({
            key,
            openUntil: circuit.openUntil,
            remainingMs: circuit.openUntil - now(),
            consecutiveFailures: circuit.consecutiveFailures,
          })
        : Object.assign(new Error(`Circuit is open for ${key}`), { code: 'CIRCUIT_OPEN', key });
      emitReport(reporter, 'circuit_open_rejected', { key, error: error?.message });
      throw error;
    }
    circuit.state = 'closed';
    circuit.openUntil = null;
    defaultLog(logger, key, 'Circuit closed after cooldown', {
      consecutiveFailures: circuit.consecutiveFailures,
    });
    emitReport(reporter, 'circuit_closed', { key, at: now(), reason: 'cooldown_expired' });
  }

  let retriesUsed = 0;
  let lastError = null;

  while (retriesUsed <= maxRetries) {
    try {
      const result = await fn();
      metrics.executions += 1;
      metrics.successes += 1;
      metrics.lastUpdatedAt = new Date(now()).toISOString();
      if (retriesUsed > 0) {
        metrics.successAfterRetry += 1;
      }
      circuit.consecutiveFailures = 0;
      emitReport(reporter, 'execution_success', {
        key,
        retriesUsed,
        durationMs: now() - startTime,
        metrics: getRetryMetrics(key),
      });
      defaultLog(logger, key, 'Execution succeeded', {
        retriesUsed,
        successRate: getRetryMetrics(key)?.successRate,
      });
      return result;
    } catch (error) {
      const normalizedError = classifyError(error, { key });
      const retryable = shouldRetry(normalizedError);
      const retriesRemaining = maxRetries - retriesUsed;
      lastError = normalizedError;

      if (!retryable || retriesRemaining <= 0) {
        metrics.executions += 1;
        metrics.failures += 1;
        metrics.lastUpdatedAt = new Date(now()).toISOString();
        circuit.consecutiveFailures += 1;
        if (circuit.consecutiveFailures >= circuitBreakerThreshold) {
          circuit.state = 'open';
          circuit.openedAt = now();
          circuit.openUntil = now() + circuitBreakerDuration;
          defaultLog(logger, key, 'Circuit opened', {
            openUntil: circuit.openUntil,
            consecutiveFailures: circuit.consecutiveFailures,
          });
          emitReport(reporter, 'circuit_opened', {
            key,
            openUntil: circuit.openUntil,
            consecutiveFailures: circuit.consecutiveFailures,
          });
        }
        emitReport(reporter, 'execution_failed', {
          key,
          retriesUsed,
          retryable,
          durationMs: now() - startTime,
          error: { name: normalizedError.name, message: normalizedError.message },
          metrics: getRetryMetrics(key),
        });
        throw normalizedError;
      }

      const retryDelay = calculateDelay(retriesUsed, { baseDelay, maxDelay, random, jitterMax });
      const retryAfterMs = normalizedError?.retryAfterMs;
      const appliedDelay = retryAfterMs ? Math.max(retryDelay * 2, retryAfterMs) : retryDelay;

      metrics.retryAttempts += 1;
      metrics.lastUpdatedAt = new Date(now()).toISOString();

      emitReport(reporter, 'retry_scheduled', {
        key,
        retryAttempt: retriesUsed + 1,
        retriesRemaining,
        delayMs: appliedDelay,
        error: { name: normalizedError.name, message: normalizedError.message },
        metrics: getRetryMetrics(key),
      });
      defaultLog(logger, key, 'Retry scheduled', {
        retryAttempt: retriesUsed + 1,
        retriesRemaining,
        delayMs: appliedDelay,
        reason: normalizedError.message,
      });

      retriesUsed += 1;
      await sleep(appliedDelay);
    }
  }

  throw lastError;
}

import {
  getCircuitState,
  getMetricState,
  defaultLog,
  errorPayload,
  emitReport,
  openCircuit,
  getRetryMetrics,
  resetRetryState,
  classifyApplyErrorFallback,
} from './circuit-breaker-state.js';

export { getRetryMetrics, resetRetryState };

function calculateDelay(retryAttempt, options) {
  const { baseDelay, maxDelay, random, jitterMax } = options,
    exponential = baseDelay * 2 ** retryAttempt;
  return Math.min(maxDelay, exponential + Math.floor((random?.() ?? Math.random()) * jitterMax));
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
    classifyError = (e) => classifyApplyErrorFallback(e, key),
    shouldRetry = (error) => Boolean(error?.retryable),
    onCircuitOpen = null,
    logger = console,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    reporter = null,
    now = () => Date.now(),
    random = Math.random,
  } = options;

  const circuit = getCircuitState(key);
  const metrics = getMetricState(key);
  if (circuit.state === 'open') {
    if (circuit.openUntil && now() < circuit.openUntil) {
      const context = {
        key,
        openUntil: circuit.openUntil,
        remainingMs: circuit.openUntil - now(),
        consecutiveFailures: circuit.consecutiveFailures,
      };
      const error = onCircuitOpen
        ? onCircuitOpen(context)
        : Object.assign(new Error(`Circuit is open for ${key}`), {
            code: 'CIRCUIT_OPEN',
            key,
            metadata: context,
          });
      emitReport(reporter, 'circuit_open_rejected', { key, error: error?.message });
      throw error;
    }
    circuit.state = 'closed';
    circuit.openUntil = null;
    defaultLog(logger, key, 'Circuit closed after cooldown', {
      consecutiveFailures: circuit.consecutiveFailures,
    });
    emitReport(reporter, 'circuit_closed', { key, reason: 'cooldown_expired' });
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
          openCircuit(circuit, key, {
            now,
            duration: circuitBreakerDuration,
            logger,
            reporter,
            consecutiveFailures: circuit.consecutiveFailures,
          });
        }
        emitReport(reporter, 'execution_failed', {
          key,
          retriesUsed,
          retryable,
          error: errorPayload(normalizedError),
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
        error: errorPayload(normalizedError),
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

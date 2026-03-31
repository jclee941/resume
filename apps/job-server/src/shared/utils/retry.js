import {
  CircuitOpenError,
  RateLimitError,
  classifyApplyError,
  isRetryableApplyError,
} from '../errors/apply-errors.js';

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

function logStateChange(logger, platform, message, payload = {}) {
  const targetLogger = logger && typeof logger.info === 'function' ? logger : console;
  targetLogger.info(`[retry:${platform}] ${message}`, payload);
}

function emitReport(reporter, event, payload) {
  if (typeof reporter === 'function') {
    reporter(event, payload);
  }
}

export function getRetryMetrics(platform = null) {
  if (platform) {
    const metric = RETRY_METRICS.get(platform);
    if (!metric) {
      return null;
    }

    const successRate = metric.executions > 0 ? metric.successes / metric.executions : 0;
    return {
      platform,
      ...metric,
      successRate,
    };
  }

  return [...RETRY_METRICS.entries()].reduce((acc, [key, value]) => {
    const successRate = value.executions > 0 ? value.successes / value.executions : 0;
    acc[key] = { ...value, successRate };
    return acc;
  }, {});
}

export function resetRetryState(platform = null) {
  if (platform) {
    CIRCUIT_STATE.delete(platform);
    RETRY_METRICS.delete(platform);
    return;
  }

  CIRCUIT_STATE.clear();
  RETRY_METRICS.clear();
}

export async function withRetry(fn, options = {}) {
  const {
    platform = 'unknown',
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitterMax = 1000,
    circuitBreakerThreshold = 3,
    circuitBreakerDuration = 5 * 60 * 1000,
    classifyError = classifyApplyError,
    shouldRetry = isRetryableApplyError,
    logger = console,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    reporter = null,
    now = () => Date.now(),
    random = Math.random,
  } = options;

  const circuit = getCircuitState(platform);
  const metrics = getMetricState(platform);
  const startTime = now();

  if (circuit.state === 'open') {
    if (circuit.openUntil && now() < circuit.openUntil) {
      const error = new CircuitOpenError(`Circuit is open for ${platform}`, {
        platform,
        metadata: {
          openUntil: circuit.openUntil,
          remainingMs: circuit.openUntil - now(),
          consecutiveFailures: circuit.consecutiveFailures,
        },
      });

      emitReport(reporter, 'circuit_open_rejected', { platform, error: error.toJSON() });
      throw error;
    }

    circuit.state = 'closed';
    circuit.openUntil = null;
    logStateChange(logger, platform, 'Circuit closed after cooldown', {
      consecutiveFailures: circuit.consecutiveFailures,
    });
    emitReport(reporter, 'circuit_closed', {
      platform,
      at: now(),
      reason: 'cooldown_expired',
    });
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
        platform,
        retriesUsed,
        durationMs: now() - startTime,
        metrics: getRetryMetrics(platform),
      });

      logStateChange(logger, platform, 'Apply execution succeeded', {
        retriesUsed,
        successRate: getRetryMetrics(platform)?.successRate,
      });

      return result;
    } catch (error) {
      const normalizedError = classifyError(error, { platform });
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
          logStateChange(logger, platform, 'Circuit opened', {
            openUntil: circuit.openUntil,
            consecutiveFailures: circuit.consecutiveFailures,
          });
          emitReport(reporter, 'circuit_opened', {
            platform,
            openUntil: circuit.openUntil,
            consecutiveFailures: circuit.consecutiveFailures,
          });
        }

        emitReport(reporter, 'execution_failed', {
          platform,
          retriesUsed,
          retryable,
          durationMs: now() - startTime,
          error:
            typeof normalizedError.toJSON === 'function'
              ? normalizedError.toJSON()
              : { name: normalizedError.name, message: normalizedError.message },
          metrics: getRetryMetrics(platform),
        });

        throw normalizedError;
      }

      const retryDelay = calculateDelay(retriesUsed, {
        baseDelay,
        maxDelay,
        random,
        jitterMax,
      });

      const appliedDelay =
        normalizedError instanceof RateLimitError && normalizedError.retryAfterMs
          ? Math.max(retryDelay * 2, normalizedError.retryAfterMs)
          : retryDelay;

      metrics.retryAttempts += 1;
      metrics.lastUpdatedAt = new Date(now()).toISOString();

      emitReport(reporter, 'retry_scheduled', {
        platform,
        retryAttempt: retriesUsed + 1,
        retriesRemaining,
        delayMs: appliedDelay,
        error:
          typeof normalizedError.toJSON === 'function'
            ? normalizedError.toJSON()
            : { name: normalizedError.name, message: normalizedError.message },
        metrics: getRetryMetrics(platform),
      });

      logStateChange(logger, platform, 'Retry scheduled', {
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

import {
  CircuitOpenError,
  RateLimitError,
  classifyApplyError,
  isRetryableApplyError,
} from '../errors/apply-errors.js';

// Issue #16: Module state encapsulated in closure-bound holders to eliminate
// top-level mutable bindings. Each holder still exists once per module instance,
// but tests can call resetRetryState() to reset cleanly. See
// docs/architecture/TECH_DEBT_AUDIT_2026-04-29.md § P0-5 for the pattern.
const _circuitStateHolder = (() => {
  let m = new Map();
  return {
    get: () => m,
    clear: () => { m = new Map(); },
  };
})();
const _retryMetricsHolder = (() => {
  let m = new Map();
  return {
    get: () => m,
    clear: () => { m = new Map(); },
  };
})();

function getCircuitState(key) {
  if (!_circuitStateHolder.get().has(key)) {
    _circuitStateHolder.get().set(key, {
      state: 'closed',
      consecutiveFailures: 0,
      openedAt: null,
      openUntil: null,
    });
  }

  return _circuitStateHolder.get().get(key);
}

function getMetricState(key) {
  if (!_retryMetricsHolder.get().has(key)) {
    _retryMetricsHolder.get().set(key, {
      executions: 0,
      successes: 0,
      failures: 0,
      retryAttempts: 0,
      successAfterRetry: 0,
      lastUpdatedAt: null,
    });
  }

  return _retryMetricsHolder.get().get(key);
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
    const metric = _retryMetricsHolder.get().get(platform);
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

  return [..._retryMetricsHolder.get().entries()].reduce((acc, [key, value]) => {
    const successRate = value.executions > 0 ? value.successes / value.executions : 0;
    acc[key] = { ...value, successRate };
    return acc;
  }, {});
}

export function resetRetryState(platform = null) {
  if (platform) {
    _circuitStateHolder.get().delete(platform);
    _retryMetricsHolder.get().delete(platform);
    return;
  }

  _circuitStateHolder.clear();
  _retryMetricsHolder.clear();
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

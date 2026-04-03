import { EventEmitter } from 'node:events';

import { CircuitOpenError } from '../../errors/apply-errors.js';

export const CircuitState = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

const DEFAULT_RETRY_CONFIG = Object.freeze({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 429, 500, 502, 503, 504],
});

const DEFAULT_CIRCUIT_CONFIG = Object.freeze({
  failureThreshold: 5,
  resetTimeout: 60000,
  halfOpenMaxCalls: 3,
});

function nowMs() {
  return Date.now();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryService extends EventEmitter {
  #retryConfig;
  #circuitConfig;
  #clock;
  #sleeper;
  #circuits;
  #stats;
  #serviceLocks;

  constructor(config = {}) {
    super();

    this.#retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...(config.retry ?? {}),
    };

    this.#circuitConfig = {
      ...DEFAULT_CIRCUIT_CONFIG,
      ...(config.circuit ?? {}),
    };

    this.#clock = typeof config.now === 'function' ? config.now : nowMs;
    this.#sleeper = typeof config.sleep === 'function' ? config.sleep : sleep;

    this.#circuits = new Map();
    this.#stats = {
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalRetries: 0,
      totalCircuitRejections: 0,
      services: new Map(),
    };
    this.#serviceLocks = new Map();
  }

  async execute(operation, options = {}) {
    if (typeof operation !== 'function') {
      throw new TypeError('operation must be a function that returns a promise');
    }

    const serviceName = options.serviceName ?? options.platform ?? 'default';
    const retryConfig = { ...this.#retryConfig, ...(options.retry ?? {}) };
    const circuitConfig = { ...this.#circuitConfig, ...(options.circuit ?? {}) };
    const startTotal = this.#clock();

    let attempt = 0;

    while (attempt <= retryConfig.maxRetries) {
      const gate = await this.#enterCircuit(serviceName, circuitConfig);

      if (!gate.allowed) {
        this.#recordCircuitRejection(serviceName);
        const error = new CircuitOpenError(
          `${serviceName} circuit is open. Retry after cooldown period.`,
          {
            platform: serviceName,
            metadata: {
              serviceName,
              state: gate.state,
              openedAt: gate.openedAt,
              resetAt: gate.resetAt,
            },
          }
        );

        this.emit('circuit:rejected', {
          serviceName,
          state: gate.state,
          resetAt: gate.resetAt,
          error,
        });

        throw error;
      }

      const attemptStart = this.#clock();

      try {
        const result = await operation();
        const latencyMs = this.#clock() - attemptStart;

        await this.#recordSuccess(serviceName, circuitConfig, {
          fromHalfOpen: gate.fromHalfOpen,
          latencyMs,
        });

        this.emit('operation:success', {
          serviceName,
          attempt,
          retriesUsed: attempt,
          latencyMs,
          totalLatencyMs: this.#clock() - startTotal,
        });

        return result;
      } catch (error) {
        const latencyMs = this.#clock() - attemptStart;
        const retryable = this.#isRetryableError(error, retryConfig);
        const hasRetry = retryable && attempt < retryConfig.maxRetries;

        await this.#recordFailure(serviceName, circuitConfig, {
          fromHalfOpen: gate.fromHalfOpen,
          latencyMs,
          error,
        });

        this.emit('operation:failure', {
          serviceName,
          attempt,
          retryable,
          latencyMs,
          error,
        });

        if (!hasRetry) {
          throw error;
        }

        const delayMs = this.#calculateBackoffDelay(attempt, retryConfig);
        this.#recordRetry(serviceName);

        this.emit('retry:scheduled', {
          serviceName,
          attempt: attempt + 1,
          delayMs,
          error,
        });

        attempt += 1;
        await this.#sleeper(delayMs);
      }
    }

    throw new Error(`Retry execution exhausted for service: ${serviceName}`);
  }

  getCircuitState(serviceName) {
    const circuit = this.#getOrCreateCircuit(serviceName);
    return {
      serviceName,
      state: circuit.state,
      failureCount: circuit.failureCount,
      openedAt: circuit.openedAt,
      resetAt: circuit.resetAt,
      halfOpenActiveCalls: circuit.halfOpenActiveCalls,
      halfOpenSuccesses: circuit.halfOpenSuccesses,
    };
  }

  async resetCircuit(serviceName) {
    await this.#withServiceLock(serviceName, async () => {
      const circuit = this.#getOrCreateCircuit(serviceName);
      this.#setClosedState(circuit);
      circuit.failureCount = 0;
      circuit.openedAt = null;
      circuit.resetAt = null;
      circuit.halfOpenActiveCalls = 0;
      circuit.halfOpenSuccesses = 0;
    });

    this.emit('circuit:closed', {
      serviceName,
      reason: 'manual_reset',
      state: CircuitState.CLOSED,
    });
  }

  getStats() {
    const services = {};

    for (const [serviceName, serviceStats] of this.#stats.services.entries()) {
      services[serviceName] = this.#formatServiceStats(serviceStats);
    }

    const totalSuccessRate =
      this.#stats.totalExecutions > 0
        ? this.#stats.totalSuccesses / this.#stats.totalExecutions
        : 0;

    return {
      totalExecutions: this.#stats.totalExecutions,
      totalSuccesses: this.#stats.totalSuccesses,
      totalFailures: this.#stats.totalFailures,
      totalRetries: this.#stats.totalRetries,
      totalCircuitRejections: this.#stats.totalCircuitRejections,
      totalSuccessRate,
      services,
    };
  }

  async #enterCircuit(serviceName, circuitConfig) {
    return this.#withServiceLock(serviceName, async () => {
      const circuit = this.#getOrCreateCircuit(serviceName);
      const currentTime = this.#clock();

      if (circuit.state === CircuitState.OPEN) {
        if (circuit.resetAt && currentTime >= circuit.resetAt) {
          circuit.state = CircuitState.HALF_OPEN;
          circuit.halfOpenActiveCalls = 0;
          circuit.halfOpenSuccesses = 0;

          this.emit('circuit:half_open', {
            serviceName,
            state: circuit.state,
            openedAt: circuit.openedAt,
            resetAt: circuit.resetAt,
          });
        } else {
          return {
            allowed: false,
            state: circuit.state,
            openedAt: circuit.openedAt,
            resetAt: circuit.resetAt,
            fromHalfOpen: false,
          };
        }
      }

      if (circuit.state === CircuitState.HALF_OPEN) {
        if (circuit.halfOpenActiveCalls >= circuitConfig.halfOpenMaxCalls) {
          return {
            allowed: false,
            state: circuit.state,
            openedAt: circuit.openedAt,
            resetAt: circuit.resetAt,
            fromHalfOpen: true,
          };
        }

        circuit.halfOpenActiveCalls += 1;
        return {
          allowed: true,
          state: circuit.state,
          openedAt: circuit.openedAt,
          resetAt: circuit.resetAt,
          fromHalfOpen: true,
        };
      }

      return {
        allowed: true,
        state: circuit.state,
        openedAt: circuit.openedAt,
        resetAt: circuit.resetAt,
        fromHalfOpen: false,
      };
    });
  }

  async #recordSuccess(serviceName, circuitConfig, context) {
    await this.#withServiceLock(serviceName, async () => {
      const circuit = this.#getOrCreateCircuit(serviceName);
      const serviceStats = this.#getOrCreateServiceStats(serviceName);

      this.#stats.totalExecutions += 1;
      this.#stats.totalSuccesses += 1;

      serviceStats.executions += 1;
      serviceStats.successes += 1;
      this.#recordLatency(serviceStats, context.latencyMs);

      circuit.failureCount = 0;

      if (context.fromHalfOpen) {
        circuit.halfOpenActiveCalls = Math.max(0, circuit.halfOpenActiveCalls - 1);
        circuit.halfOpenSuccesses += 1;

        if (circuit.halfOpenSuccesses >= circuitConfig.halfOpenMaxCalls) {
          this.#setClosedState(circuit);
          this.emit('circuit:closed', {
            serviceName,
            reason: 'recovered',
            state: circuit.state,
          });
        }
      }
    });
  }

  async #recordFailure(serviceName, circuitConfig, context) {
    await this.#withServiceLock(serviceName, async () => {
      const circuit = this.#getOrCreateCircuit(serviceName);
      const serviceStats = this.#getOrCreateServiceStats(serviceName);

      this.#stats.totalExecutions += 1;
      this.#stats.totalFailures += 1;

      serviceStats.executions += 1;
      serviceStats.failures += 1;
      this.#recordLatency(serviceStats, context.latencyMs);
      serviceStats.lastError = {
        name: context.error?.name ?? 'Error',
        message: context.error?.message ?? String(context.error),
        at: new Date(this.#clock()).toISOString(),
      };

      if (context.fromHalfOpen) {
        circuit.halfOpenActiveCalls = Math.max(0, circuit.halfOpenActiveCalls - 1);
        this.#setOpenState(circuit, circuitConfig);
        this.emit('circuit:open', {
          serviceName,
          reason: 'half_open_failure',
          state: circuit.state,
          openedAt: circuit.openedAt,
          resetAt: circuit.resetAt,
          failureCount: circuit.failureCount,
        });
        return;
      }

      circuit.failureCount += 1;
      if (circuit.failureCount >= circuitConfig.failureThreshold) {
        this.#setOpenState(circuit, circuitConfig);
        this.emit('circuit:open', {
          serviceName,
          reason: 'failure_threshold_reached',
          state: circuit.state,
          openedAt: circuit.openedAt,
          resetAt: circuit.resetAt,
          failureCount: circuit.failureCount,
        });
      }
    });
  }

  #recordRetry(serviceName) {
    const serviceStats = this.#getOrCreateServiceStats(serviceName);
    this.#stats.totalRetries += 1;
    serviceStats.retries += 1;
  }

  #recordCircuitRejection(serviceName) {
    const serviceStats = this.#getOrCreateServiceStats(serviceName);
    this.#stats.totalCircuitRejections += 1;
    serviceStats.circuitRejections += 1;
  }

  #isRetryableError(error, retryConfig) {
    const retryableSet = new Set(retryConfig.retryableErrors);

    const code = error?.code ?? error?.cause?.code;
    if (code && retryableSet.has(code)) {
      return true;
    }

    const statusCandidates = [
      error?.status,
      error?.statusCode,
      error?.response?.status,
      error?.cause?.status,
      error?.cause?.statusCode,
    ];

    return statusCandidates.some(
      (status) => Number.isFinite(Number(status)) && retryableSet.has(Number(status))
    );
  }

  #calculateBackoffDelay(attempt, retryConfig) {
    const exponential = retryConfig.baseDelay * retryConfig.backoffMultiplier ** attempt;
    const capped = Math.min(retryConfig.maxDelay, exponential);

    if (!retryConfig.jitter) {
      return Math.floor(capped);
    }

    const jitterFactor = 0.5 + Math.random();
    return Math.floor(capped * jitterFactor);
  }

  #setOpenState(circuit, circuitConfig) {
    const currentTime = this.#clock();
    circuit.state = CircuitState.OPEN;
    circuit.openedAt = currentTime;
    circuit.resetAt = currentTime + circuitConfig.resetTimeout;
    circuit.halfOpenActiveCalls = 0;
    circuit.halfOpenSuccesses = 0;
  }

  #setClosedState(circuit) {
    circuit.state = CircuitState.CLOSED;
    circuit.failureCount = 0;
    circuit.openedAt = null;
    circuit.resetAt = null;
    circuit.halfOpenActiveCalls = 0;
    circuit.halfOpenSuccesses = 0;
  }

  #recordLatency(serviceStats, latencyMs) {
    serviceStats.totalLatencyMs += latencyMs;
    serviceStats.minLatencyMs = Math.min(serviceStats.minLatencyMs, latencyMs);
    serviceStats.maxLatencyMs = Math.max(serviceStats.maxLatencyMs, latencyMs);
  }

  #formatServiceStats(serviceStats) {
    const successRate =
      serviceStats.executions > 0 ? serviceStats.successes / serviceStats.executions : 0;
    const averageLatencyMs =
      serviceStats.executions > 0 ? serviceStats.totalLatencyMs / serviceStats.executions : 0;

    return {
      executions: serviceStats.executions,
      successes: serviceStats.successes,
      failures: serviceStats.failures,
      retries: serviceStats.retries,
      circuitRejections: serviceStats.circuitRejections,
      successRate,
      averageLatencyMs,
      minLatencyMs: Number.isFinite(serviceStats.minLatencyMs) ? serviceStats.minLatencyMs : null,
      maxLatencyMs: Number.isFinite(serviceStats.maxLatencyMs) ? serviceStats.maxLatencyMs : null,
      lastError: serviceStats.lastError,
    };
  }

  #getOrCreateCircuit(serviceName) {
    if (!this.#circuits.has(serviceName)) {
      this.#circuits.set(serviceName, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        openedAt: null,
        resetAt: null,
        halfOpenActiveCalls: 0,
        halfOpenSuccesses: 0,
      });
    }

    return this.#circuits.get(serviceName);
  }

  #getOrCreateServiceStats(serviceName) {
    if (!this.#stats.services.has(serviceName)) {
      this.#stats.services.set(serviceName, {
        executions: 0,
        successes: 0,
        failures: 0,
        retries: 0,
        circuitRejections: 0,
        totalLatencyMs: 0,
        minLatencyMs: Number.POSITIVE_INFINITY,
        maxLatencyMs: 0,
        lastError: null,
      });
    }

    return this.#stats.services.get(serviceName);
  }

  async #withServiceLock(serviceName, fn) {
    const previous = this.#serviceLocks.get(serviceName) ?? Promise.resolve();
    let releaseLock;
    const next = new Promise((resolve) => {
      releaseLock = resolve;
    });

    this.#serviceLocks.set(
      serviceName,
      previous.finally(() => next)
    );

    await previous;
    try {
      return await fn();
    } finally {
      releaseLock();
    }
  }
}

export default RetryService;

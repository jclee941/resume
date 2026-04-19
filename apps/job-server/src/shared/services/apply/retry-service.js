import { EventEmitter } from 'node:events';

import { CircuitOpenError } from '../../errors/apply-errors.js';
import {
  CircuitState,
  DEFAULT_CIRCUIT_CONFIG,
  DEFAULT_RETRY_CONFIG,
} from './retry-service/constants.js';
import { calculateBackoffDelay, isRetryableError, nowMs, sleep } from './retry-service/helpers.js';
import { enterCircuit, recordFailure, recordSuccess } from './retry-service/operations.js';
import {
  createStatsState,
  formatServiceStats,
  getOrCreateCircuit,
  recordCircuitRejection,
  recordRetry,
  setClosedState,
} from './retry-service/state.js';

export { CircuitState };

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
    this.#retryConfig = { ...DEFAULT_RETRY_CONFIG, ...(config.retry ?? {}) };
    this.#circuitConfig = { ...DEFAULT_CIRCUIT_CONFIG, ...(config.circuit ?? {}) };
    this.#clock = typeof config.now === 'function' ? config.now : nowMs;
    this.#sleeper = typeof config.sleep === 'function' ? config.sleep : sleep;
    this.#circuits = new Map();
    this.#stats = createStatsState();
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
      const gate = await this.#withServiceLock(serviceName, () =>
        enterCircuit(
          {
            circuits: this.#circuits,
            clock: this.#clock,
            emit: this.emit.bind(this),
          },
          serviceName,
          circuitConfig
        )
      );

      if (!gate.allowed) {
        recordCircuitRejection(this.#stats, serviceName);
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

        await this.#withServiceLock(serviceName, () =>
          recordSuccess(
            {
              circuits: this.#circuits,
              stats: this.#stats,
              emit: this.emit.bind(this),
            },
            serviceName,
            circuitConfig,
            {
              fromHalfOpen: gate.fromHalfOpen,
              latencyMs,
            }
          )
        );

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
        const retryable = isRetryableError(error, retryConfig);
        const hasRetry = retryable && attempt < retryConfig.maxRetries;

        await this.#withServiceLock(serviceName, () =>
          recordFailure(
            {
              circuits: this.#circuits,
              stats: this.#stats,
              clock: this.#clock,
              emit: this.emit.bind(this),
            },
            serviceName,
            circuitConfig,
            {
              fromHalfOpen: gate.fromHalfOpen,
              latencyMs,
              error,
            }
          )
        );

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

        const delayMs = calculateBackoffDelay(attempt, retryConfig);
        recordRetry(this.#stats, serviceName);

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
    const circuit = getOrCreateCircuit(this.#circuits, serviceName);
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
      const circuit = getOrCreateCircuit(this.#circuits, serviceName);
      setClosedState(circuit);
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
      services[serviceName] = formatServiceStats(serviceStats);
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

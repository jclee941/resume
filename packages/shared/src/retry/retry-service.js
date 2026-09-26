import { EventEmitter } from 'node:events';
import {
  CircuitState,
  getCircuit,
  enterCircuit,
  createCircuitRejection,
  recordCircuitSuccess,
  recordCircuitFailure,
} from './retry-service-circuit.js';
import { createStats, serviceStats, formatOverallStats } from './retry-service-stats.js';
import { RETRY, CIRCUIT, sleep, nowMs, retryable, delay } from './retry-service-config.js';

export { CircuitState };

export class RetryService extends EventEmitter {
  #retryConfig;
  #circuitConfig;
  #clock;
  #sleeper;
  #circuits;
  #stats;
  #locks;

  constructor(config = {}) {
    super();
    this.#retryConfig = { ...RETRY, ...(config.retry ?? {}) };
    this.#circuitConfig = { ...CIRCUIT, ...(config.circuit ?? {}) };
    this.#clock = typeof config.now === 'function' ? config.now : nowMs;
    this.#sleeper = typeof config.sleep === 'function' ? config.sleep : sleep;
    this.#circuits = new Map();
    this.#stats = createStats();
    this.#locks = new Map();
  }

  async execute(operation, options = {}) {
    if (typeof operation !== 'function') {
      throw new TypeError('operation must be a function that returns a promise');
    }
    const serviceName = options.serviceName ?? options.platform ?? 'default';
    const retryConfig = { ...this.#retryConfig, ...(options.retry ?? {}) };
    const circuitConfig = { ...this.#circuitConfig, ...(options.circuit ?? {}) };
    const start = this.#clock();
    let attempt = 0;

    const emit = (event, payload) => this.emit(event, payload);

    while (attempt <= retryConfig.maxRetries) {
      const gate = await this.#locked(serviceName, () =>
        enterCircuit(this.#circuits, serviceName, circuitConfig, this.#clock, emit)
      );
      if (!gate.allowed) {
        throw createCircuitRejection(serviceName, gate, this.#stats, emit);
      }
      const attemptStart = this.#clock();
      try {
        const result = await operation();
        const latencyMs = this.#clock() - attemptStart;
        await this.#locked(serviceName, () =>
          recordCircuitSuccess(
            this.#circuits,
            serviceName,
            circuitConfig,
            gate,
            latencyMs,
            this.#stats,
            emit
          )
        );
        this.emit('operation:success', {
          serviceName,
          attempt,
          retriesUsed: attempt,
          latencyMs,
          totalLatencyMs: this.#clock() - start,
        });
        return result;
      } catch (error) {
        const latencyMs = this.#clock() - attemptStart;
        const canRetry = retryable(error, retryConfig) && attempt < retryConfig.maxRetries;
        await this.#locked(serviceName, () =>
          recordCircuitFailure(
            this.#circuits,
            serviceName,
            circuitConfig,
            gate,
            latencyMs,
            error,
            this.#stats,
            this.#clock,
            emit
          )
        );
        this.emit('operation:failure', {
          serviceName,
          attempt,
          retryable: canRetry,
          latencyMs,
          error,
        });
        if (!canRetry) throw error;
        const delayMs = delay(attempt, retryConfig);
        const s = serviceStats(this.#stats, serviceName);
        s.retries += 1;
        this.#stats.totalRetries += 1;
        this.emit('retry:scheduled', { serviceName, attempt: attempt + 1, delayMs, error });
        attempt += 1;
        await this.#sleeper(delayMs);
      }
    }
    throw new Error(`Retry execution exhausted for service: ${serviceName}`);
  }

  getCircuitState(serviceName) {
    return { serviceName, ...getCircuit(this.#circuits, serviceName) };
  }

  getStats() {
    return formatOverallStats(this.#stats);
  }

  async #locked(name, fn) {
    const previous = this.#locks.get(name) ?? Promise.resolve();
    let release;
    const next = new Promise((resolve) => {
      release = resolve;
    });
    this.#locks.set(
      name,
      previous.finally(() => next)
    );
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export default RetryService;

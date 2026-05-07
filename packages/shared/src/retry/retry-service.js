import { EventEmitter } from 'node:events';

export const CircuitState = Object.freeze({ CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' });
const RETRYABLE = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 429, 500, 502, 503, 504];
const RETRY = { maxRetries: 3, baseDelay: 1000, maxDelay: 30000, backoffMultiplier: 2, jitter: true, retryableErrors: RETRYABLE };
const CIRCUIT = { failureThreshold: 5, resetTimeout: 60000, halfOpenMaxCalls: 3 };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nowMs = () => Date.now();

function circuit() {
  return { state: CircuitState.CLOSED, failureCount: 0, openedAt: null, resetAt: null, halfOpenActiveCalls: 0, halfOpenSuccesses: 0 };
}

function stats() {
  return { totalExecutions: 0, totalSuccesses: 0, totalFailures: 0, totalRetries: 0, totalCircuitRejections: 0, services: new Map() };
}

function serviceStats(state, name) {
  if (!state.services.has(name)) {
    state.services.set(name, { executions: 0, successes: 0, failures: 0, retries: 0, circuitRejections: 0, totalLatencyMs: 0, minLatencyMs: Infinity, maxLatencyMs: 0, lastError: null });
  }
  return state.services.get(name);
}

function getCircuit(map, name) {
  if (!map.has(name)) map.set(name, circuit());
  return map.get(name);
}

function retryable(error, config) {
  const values = new Set(config.retryableErrors);
  const code = error?.code ?? error?.cause?.code;
  if (code && values.has(code)) return true;
  return [error?.status, error?.statusCode, error?.response?.status, error?.cause?.status, error?.cause?.statusCode]
    .some((status) => Number.isFinite(Number(status)) && values.has(Number(status)));
}

function delay(attempt, config) {
  const capped = Math.min(config.maxDelay, config.baseDelay * config.backoffMultiplier ** attempt);
  return Math.floor(config.jitter ? capped * (0.5 + Math.random()) : capped);
}

function close(c) { Object.assign(c, circuit()); }
function open(c, config, clock) {
  const now = clock();
  Object.assign(c, { state: CircuitState.OPEN, openedAt: now, resetAt: now + config.resetTimeout, halfOpenActiveCalls: 0, halfOpenSuccesses: 0 });
}

function addLatency(s, ms) {
  s.totalLatencyMs += ms; s.minLatencyMs = Math.min(s.minLatencyMs, ms); s.maxLatencyMs = Math.max(s.maxLatencyMs, ms);
}

function format(s) {
  const successRate = s.executions > 0 ? s.successes / s.executions : 0;
  return { executions: s.executions, successes: s.successes, failures: s.failures, retries: s.retries, circuitRejections: s.circuitRejections, successRate, averageLatencyMs: s.executions > 0 ? s.totalLatencyMs / s.executions : 0, minLatencyMs: Number.isFinite(s.minLatencyMs) ? s.minLatencyMs : null, maxLatencyMs: Number.isFinite(s.maxLatencyMs) ? s.maxLatencyMs : null, lastError: s.lastError };
}

export class RetryService extends EventEmitter {
  #retryConfig; #circuitConfig; #clock; #sleeper; #circuits; #stats; #locks;
  constructor(config = {}) {
    super();
    this.#retryConfig = { ...RETRY, ...(config.retry ?? {}) };
    this.#circuitConfig = { ...CIRCUIT, ...(config.circuit ?? {}) };
    this.#clock = typeof config.now === 'function' ? config.now : nowMs;
    this.#sleeper = typeof config.sleep === 'function' ? config.sleep : sleep;
    this.#circuits = new Map(); this.#stats = stats(); this.#locks = new Map();
  }

  async execute(operation, options = {}) {
    if (typeof operation !== 'function') throw new TypeError('operation must be a function that returns a promise');
    const serviceName = options.serviceName ?? options.platform ?? 'default';
    const retryConfig = { ...this.#retryConfig, ...(options.retry ?? {}) };
    const circuitConfig = { ...this.#circuitConfig, ...(options.circuit ?? {}) };
    const start = this.#clock(); let attempt = 0;
    while (attempt <= retryConfig.maxRetries) {
      const gate = await this.#locked(serviceName, () => this.#enter(serviceName, circuitConfig));
      if (!gate.allowed) throw this.#reject(serviceName, gate);
      const attemptStart = this.#clock();
      try {
        const result = await operation();
        const latencyMs = this.#clock() - attemptStart;
        await this.#locked(serviceName, () => this.#success(serviceName, circuitConfig, gate, latencyMs));
        this.emit('operation:success', { serviceName, attempt, retriesUsed: attempt, latencyMs, totalLatencyMs: this.#clock() - start });
        return result;
      } catch (error) {
        const latencyMs = this.#clock() - attemptStart;
        const canRetry = retryable(error, retryConfig) && attempt < retryConfig.maxRetries;
        await this.#locked(serviceName, () => this.#failure(serviceName, circuitConfig, gate, latencyMs, error));
        this.emit('operation:failure', { serviceName, attempt, retryable: canRetry, latencyMs, error });
        if (!canRetry) throw error;
        const delayMs = delay(attempt, retryConfig); const s = serviceStats(this.#stats, serviceName);
        s.retries += 1; this.#stats.totalRetries += 1;
        this.emit('retry:scheduled', { serviceName, attempt: attempt + 1, delayMs, error });
        attempt += 1; await this.#sleeper(delayMs);
      }
    }
    throw new Error(`Retry execution exhausted for service: ${serviceName}`);
  }

  getCircuitState(serviceName) { return { serviceName, ...getCircuit(this.#circuits, serviceName) }; }

  async resetCircuit(serviceName) {
    await this.#locked(serviceName, () => close(getCircuit(this.#circuits, serviceName)));
    this.emit('circuit:closed', { serviceName, reason: 'manual_reset', state: CircuitState.CLOSED });
  }

  getStats() {
    const services = {};
    for (const [serviceName, value] of this.#stats.services.entries()) services[serviceName] = format(value);
    return { totalExecutions: this.#stats.totalExecutions, totalSuccesses: this.#stats.totalSuccesses, totalFailures: this.#stats.totalFailures, totalRetries: this.#stats.totalRetries, totalCircuitRejections: this.#stats.totalCircuitRejections, totalSuccessRate: this.#stats.totalExecutions > 0 ? this.#stats.totalSuccesses / this.#stats.totalExecutions : 0, services };
  }

  #enter(name, config) {
    const c = getCircuit(this.#circuits, name); const current = this.#clock();
    if (c.state === CircuitState.OPEN && c.resetAt && current >= c.resetAt) {
      c.state = CircuitState.HALF_OPEN; c.halfOpenActiveCalls = 0; c.halfOpenSuccesses = 0;
      this.emit('circuit:half_open', { serviceName: name, state: c.state, openedAt: c.openedAt, resetAt: c.resetAt });
    }
    if (c.state === CircuitState.OPEN) return { allowed: false, state: c.state, openedAt: c.openedAt, resetAt: c.resetAt, fromHalfOpen: false };
    if (c.state !== CircuitState.HALF_OPEN) return { allowed: true, state: c.state, openedAt: c.openedAt, resetAt: c.resetAt, fromHalfOpen: false };
    if (c.halfOpenActiveCalls >= config.halfOpenMaxCalls) return { allowed: false, state: c.state, openedAt: c.openedAt, resetAt: c.resetAt, fromHalfOpen: true };
    c.halfOpenActiveCalls += 1; return { allowed: true, state: c.state, openedAt: c.openedAt, resetAt: c.resetAt, fromHalfOpen: true };
  }

  #reject(name, gate) {
    const s = serviceStats(this.#stats, name); s.circuitRejections += 1; this.#stats.totalCircuitRejections += 1;
    const error = Object.assign(new Error(`${name} circuit is open. Retry after cooldown period.`), { code: 'CIRCUIT_OPEN', key: name, platform: name, metadata: { serviceName: name, state: gate.state, openedAt: gate.openedAt, resetAt: gate.resetAt } });
    this.emit('circuit:rejected', { serviceName: name, state: gate.state, resetAt: gate.resetAt, error });
    return error;
  }

  #success(name, config, gate, ms) {
    const c = getCircuit(this.#circuits, name); const s = serviceStats(this.#stats, name);
    this.#stats.totalExecutions += 1; this.#stats.totalSuccesses += 1; s.executions += 1; s.successes += 1; addLatency(s, ms); c.failureCount = 0;
    if (!gate.fromHalfOpen) return;
    c.halfOpenActiveCalls = Math.max(0, c.halfOpenActiveCalls - 1); c.halfOpenSuccesses += 1;
    if (c.halfOpenSuccesses >= config.halfOpenMaxCalls) { close(c); this.emit('circuit:closed', { serviceName: name, reason: 'recovered', state: c.state }); }
  }

  #failure(name, config, gate, ms, error) {
    const c = getCircuit(this.#circuits, name); const s = serviceStats(this.#stats, name);
    this.#stats.totalExecutions += 1; this.#stats.totalFailures += 1; s.executions += 1; s.failures += 1; addLatency(s, ms);
    s.lastError = { name: error?.name ?? 'Error', message: error?.message ?? String(error), at: new Date(this.#clock()).toISOString() };
    if (gate.fromHalfOpen) { c.halfOpenActiveCalls = Math.max(0, c.halfOpenActiveCalls - 1); open(c, config, this.#clock); this.#emitOpen(name, 'half_open_failure', c); return; }
    c.failureCount += 1;
    if (c.failureCount >= config.failureThreshold) { open(c, config, this.#clock); this.#emitOpen(name, 'failure_threshold_reached', c); }
  }

  #emitOpen(name, reason, c) {
    this.emit('circuit:open', { serviceName: name, reason, state: c.state, openedAt: c.openedAt, resetAt: c.resetAt, failureCount: c.failureCount });
  }

  async #locked(name, fn) {
    const previous = this.#locks.get(name) ?? Promise.resolve(); let release;
    const next = new Promise((resolve) => { release = resolve; });
    this.#locks.set(name, previous.finally(() => next)); await previous;
    try { return await fn(); } finally { release(); }
  }
}

export default RetryService;

import { serviceStats, addLatency } from './retry-service-stats.js';

export const CircuitState = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

/**
 * @typedef {'CLOSED' | 'OPEN' | 'HALF_OPEN'} CircuitStateValue
 */

/**
 * @typedef {Object} Circuit
 * @property {CircuitStateValue} state
 * @property {number} failureCount
 * @property {number | null} openedAt
 * @property {number | null} resetAt
 * @property {number} halfOpenActiveCalls
 * @property {number} halfOpenSuccesses
 */

/**
 * @typedef {Object} CircuitConfig
 * @property {number} failureThreshold
 * @property {number} resetTimeout
 * @property {number} halfOpenMaxCalls
 */

/**
 * @typedef {Object} CircuitGate
 * @property {boolean} allowed
 * @property {CircuitStateValue} state
 * @property {number | null} openedAt
 * @property {number | null} resetAt
 * @property {boolean} fromHalfOpen
 */

/**
 * @typedef {Object} CircuitHalfOpenEvent
 * @property {string} serviceName
 * @property {CircuitStateValue} state
 * @property {number | null} openedAt
 * @property {number | null} resetAt
 */

/**
 * @typedef {Object} CircuitRejectedEvent
 * @property {string} serviceName
 * @property {CircuitStateValue} state
 * @property {number | null} resetAt
 * @property {Error} error
 */

/**
 * @typedef {Object} CircuitClosedEvent
 * @property {string} serviceName
 * @property {string} reason
 * @property {CircuitStateValue} state
 */

/**
 * @typedef {Object} CircuitOpenEvent
 * @property {string} serviceName
 * @property {string} reason
 * @property {CircuitStateValue} state
 * @property {number | null} openedAt
 * @property {number | null} resetAt
 * @property {number} failureCount
 */

/**
 * @typedef {CircuitHalfOpenEvent | CircuitRejectedEvent | CircuitClosedEvent | CircuitOpenEvent} CircuitEventPayload
 */

/**
 * @typedef {(event: string, payload: CircuitEventPayload) => void} CircuitEmit
 */

/**
 * @returns {Circuit}
 */
function createCircuit() {
  return {
    state: CircuitState.CLOSED,
    failureCount: 0,
    openedAt: null,
    resetAt: null,
    halfOpenActiveCalls: 0,
    halfOpenSuccesses: 0,
  };
}

/**
 * @param {Map<string, Circuit>} map
 * @param {string} name
 * @returns {Circuit}
 */
export function getCircuit(map, name) {
  if (!map.has(name)) map.set(name, createCircuit());
  return /** @type {Circuit} */ (map.get(name));
}

/**
 * @param {Circuit} c
 * @returns {void}
 */
export function closeCircuit(c) {
  Object.assign(c, createCircuit());
}

/**
 * @param {Circuit} c
 * @param {CircuitConfig} config
 * @param {() => number} clock
 * @returns {void}
 */
export function openCircuit(c, config, clock) {
  const now = clock();
  Object.assign(c, {
    state: CircuitState.OPEN,
    openedAt: now,
    resetAt: now + config.resetTimeout,
    halfOpenActiveCalls: 0,
    halfOpenSuccesses: 0,
  });
}

/**
 * @param {Map<string, Circuit>} circuits
 * @param {string} name
 * @param {CircuitConfig} config
 * @param {() => number} clock
 * @param {CircuitEmit} emit
 * @returns {CircuitGate}
 */
export function enterCircuit(circuits, name, config, clock, emit) {
  const c = getCircuit(circuits, name);
  const current = clock();
  if (c.state === CircuitState.OPEN && c.resetAt && current >= c.resetAt) {
    c.state = CircuitState.HALF_OPEN;
    c.halfOpenActiveCalls = 0;
    c.halfOpenSuccesses = 0;
    emit('circuit:half_open', {
      serviceName: name,
      state: c.state,
      openedAt: c.openedAt,
      resetAt: c.resetAt,
    });
  }
  if (c.state === CircuitState.OPEN) {
    return {
      allowed: false,
      state: c.state,
      openedAt: c.openedAt,
      resetAt: c.resetAt,
      fromHalfOpen: false,
    };
  }
  if (c.state !== CircuitState.HALF_OPEN) {
    return {
      allowed: true,
      state: c.state,
      openedAt: c.openedAt,
      resetAt: c.resetAt,
      fromHalfOpen: false,
    };
  }
  if (c.halfOpenActiveCalls >= config.halfOpenMaxCalls) {
    return {
      allowed: false,
      state: c.state,
      openedAt: c.openedAt,
      resetAt: c.resetAt,
      fromHalfOpen: true,
    };
  }
  c.halfOpenActiveCalls += 1;
  return {
    allowed: true,
    state: c.state,
    openedAt: c.openedAt,
    resetAt: c.resetAt,
    fromHalfOpen: true,
  };
}

/**
 * @param {string} name
 * @param {CircuitGate} gate
 * @param {import('./retry-service-stats.js').StatsState} statsState
 * @param {CircuitEmit} emit
 * @returns {Error}
 */
export function createCircuitRejection(name, gate, statsState, emit) {
  const s = serviceStats(statsState, name);
  s.circuitRejections += 1;
  statsState.totalCircuitRejections += 1;
  const error = Object.assign(new Error(`${name} circuit is open. Retry after cooldown period.`), {
    code: 'CIRCUIT_OPEN',
    key: name,
    platform: name,
    metadata: {
      serviceName: name,
      state: gate.state,
      openedAt: gate.openedAt,
      resetAt: gate.resetAt,
    },
  });
  emit('circuit:rejected', {
    serviceName: name,
    state: gate.state,
    resetAt: gate.resetAt,
    error,
  });
  return error;
}

/**
 * @param {Map<string, Circuit>} circuits
 * @param {string} name
 * @param {CircuitConfig} config
 * @param {CircuitGate} gate
 * @param {number} ms
 * @param {import('./retry-service-stats.js').StatsState} statsState
 * @param {CircuitEmit} emit
 * @returns {void}
 */
export function recordCircuitSuccess(circuits, name, config, gate, ms, statsState, emit) {
  const c = getCircuit(circuits, name);
  const s = serviceStats(statsState, name);
  statsState.totalExecutions += 1;
  statsState.totalSuccesses += 1;
  s.executions += 1;
  s.successes += 1;
  addLatency(s, ms);
  c.failureCount = 0;
  if (!gate.fromHalfOpen) return;
  c.halfOpenActiveCalls = Math.max(0, c.halfOpenActiveCalls - 1);
  c.halfOpenSuccesses += 1;
  if (c.halfOpenSuccesses >= config.halfOpenMaxCalls) {
    closeCircuit(c);
    emit('circuit:closed', { serviceName: name, reason: 'recovered', state: c.state });
  }
}

/**
 * @param {CircuitEmit} emit
 * @param {string} name
 * @param {string} reason
 * @param {Circuit} c
 * @returns {void}
 */
function emitOpen(emit, name, reason, c) {
  emit('circuit:open', {
    serviceName: name,
    reason,
    state: c.state,
    openedAt: c.openedAt,
    resetAt: c.resetAt,
    failureCount: c.failureCount,
  });
}

/**
 * @param {Map<string, Circuit>} circuits
 * @param {string} name
 * @param {CircuitConfig} config
 * @param {CircuitGate} gate
 * @param {number} ms
 * @param {Error | { name?: string, message?: string } | null | undefined} error
 * @param {import('./retry-service-stats.js').StatsState} statsState
 * @param {() => number} clock
 * @param {CircuitEmit} emit
 * @returns {void}
 */
export function recordCircuitFailure(
  circuits,
  name,
  config,
  gate,
  ms,
  error,
  statsState,
  clock,
  emit
) {
  const c = getCircuit(circuits, name);
  const s = serviceStats(statsState, name);
  statsState.totalExecutions += 1;
  statsState.totalFailures += 1;
  s.executions += 1;
  s.failures += 1;
  addLatency(s, ms);
  s.lastError = /** @type {Error & { at: string }} */ ({
    name: error?.name ?? 'Error',
    message: error?.message ?? String(error),
    at: new Date(clock()).toISOString(),
  });
  if (gate.fromHalfOpen) {
    c.halfOpenActiveCalls = Math.max(0, c.halfOpenActiveCalls - 1);
    openCircuit(c, config, clock);
    emitOpen(emit, name, 'half_open_failure', c);
    return;
  }
  c.failureCount += 1;
  if (c.failureCount >= config.failureThreshold) {
    openCircuit(c, config, clock);
    emitOpen(emit, name, 'failure_threshold_reached', c);
  }
}

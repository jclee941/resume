/**
 * @typedef {Object} ServiceStatsEntry
 * @property {number} executions
 * @property {number} successes
 * @property {number} failures
 * @property {number} retries
 * @property {number} circuitRejections
 * @property {number} totalLatencyMs
 * @property {number} minLatencyMs
 * @property {number} maxLatencyMs
 * @property {string | Error | null} lastError
 */

/**
 * @typedef {Object} FormattedServiceStats
 * @property {number} executions
 * @property {number} successes
 * @property {number} failures
 * @property {number} retries
 * @property {number} circuitRejections
 * @property {number} successRate
 * @property {number} averageLatencyMs
 * @property {number | null} minLatencyMs
 * @property {number | null} maxLatencyMs
 * @property {string | Error | null} lastError
 */

/**
 * @typedef {Object} StatsState
 * @property {number} totalExecutions
 * @property {number} totalSuccesses
 * @property {number} totalFailures
 * @property {number} totalRetries
 * @property {number} totalCircuitRejections
 * @property {Map<string, ServiceStatsEntry>} services
 */

/**
 * @typedef {Object} OverallStats
 * @property {number} totalExecutions
 * @property {number} totalSuccesses
 * @property {number} totalFailures
 * @property {number} totalRetries
 * @property {number} totalCircuitRejections
 * @property {number} totalSuccessRate
 * @property {Record<string, FormattedServiceStats>} services
 */

/**
 * @returns {StatsState}
 */
export function createStats() {
  return {
    totalExecutions: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    totalRetries: 0,
    totalCircuitRejections: 0,
    services: new Map(),
  };
}

/**
 * @param {StatsState} state
 * @param {string} name
 * @returns {ServiceStatsEntry}
 */
export function serviceStats(state, name) {
  if (!state.services.has(name)) {
    state.services.set(name, {
      executions: 0,
      successes: 0,
      failures: 0,
      retries: 0,
      circuitRejections: 0,
      totalLatencyMs: 0,
      minLatencyMs: Infinity,
      maxLatencyMs: 0,
      lastError: null,
    });
  }
  return /** @type {ServiceStatsEntry} */ (state.services.get(name));
}

/**
 * @param {ServiceStatsEntry} s
 * @param {number} ms
 * @returns {void}
 */
export function addLatency(s, ms) {
  s.totalLatencyMs += ms;
  s.minLatencyMs = Math.min(s.minLatencyMs, ms);
  s.maxLatencyMs = Math.max(s.maxLatencyMs, ms);
}

/**
 * @param {ServiceStatsEntry} s
 * @returns {FormattedServiceStats}
 */
function formatServiceStats(s) {
  const successRate = s.executions > 0 ? s.successes / s.executions : 0;
  return {
    executions: s.executions,
    successes: s.successes,
    failures: s.failures,
    retries: s.retries,
    circuitRejections: s.circuitRejections,
    successRate,
    averageLatencyMs: s.executions > 0 ? s.totalLatencyMs / s.executions : 0,
    minLatencyMs: Number.isFinite(s.minLatencyMs) ? s.minLatencyMs : null,
    maxLatencyMs: Number.isFinite(s.maxLatencyMs) ? s.maxLatencyMs : null,
    lastError: s.lastError,
  };
}

/**
 * @param {StatsState} statsState
 * @returns {OverallStats}
 */
export function formatOverallStats(statsState) {
  /** @type {Record<string, FormattedServiceStats>} */
  const services = {};
  for (const [serviceName, value] of statsState.services.entries()) {
    services[serviceName] = formatServiceStats(value);
  }
  return {
    totalExecutions: statsState.totalExecutions,
    totalSuccesses: statsState.totalSuccesses,
    totalFailures: statsState.totalFailures,
    totalRetries: statsState.totalRetries,
    totalCircuitRejections: statsState.totalCircuitRejections,
    totalSuccessRate:
      statsState.totalExecutions > 0 ? statsState.totalSuccesses / statsState.totalExecutions : 0,
    services,
  };
}

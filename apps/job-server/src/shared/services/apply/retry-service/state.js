import { CircuitState } from './constants.js';

export function createStatsState() {
  return {
    totalExecutions: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    totalRetries: 0,
    totalCircuitRejections: 0,
    services: new Map(),
  };
}

export function getOrCreateCircuit(circuits, serviceName) {
  if (!circuits.has(serviceName)) {
    circuits.set(serviceName, {
      state: CircuitState.CLOSED,
      failureCount: 0,
      openedAt: null,
      resetAt: null,
      halfOpenActiveCalls: 0,
      halfOpenSuccesses: 0,
    });
  }

  return circuits.get(serviceName);
}

export function getOrCreateServiceStats(stats, serviceName) {
  if (!stats.services.has(serviceName)) {
    stats.services.set(serviceName, {
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

  return stats.services.get(serviceName);
}

export function setOpenState(circuit, circuitConfig, clock) {
  const currentTime = clock();
  circuit.state = CircuitState.OPEN;
  circuit.openedAt = currentTime;
  circuit.resetAt = currentTime + circuitConfig.resetTimeout;
  circuit.halfOpenActiveCalls = 0;
  circuit.halfOpenSuccesses = 0;
}

export function setClosedState(circuit) {
  circuit.state = CircuitState.CLOSED;
  circuit.failureCount = 0;
  circuit.openedAt = null;
  circuit.resetAt = null;
  circuit.halfOpenActiveCalls = 0;
  circuit.halfOpenSuccesses = 0;
}

export function recordLatency(serviceStats, latencyMs) {
  serviceStats.totalLatencyMs += latencyMs;
  serviceStats.minLatencyMs = Math.min(serviceStats.minLatencyMs, latencyMs);
  serviceStats.maxLatencyMs = Math.max(serviceStats.maxLatencyMs, latencyMs);
}

export function formatServiceStats(serviceStats) {
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

export function recordRetry(stats, serviceName) {
  const serviceStats = getOrCreateServiceStats(stats, serviceName);
  stats.totalRetries += 1;
  serviceStats.retries += 1;
}

export function recordCircuitRejection(stats, serviceName) {
  const serviceStats = getOrCreateServiceStats(stats, serviceName);
  stats.totalCircuitRejections += 1;
  serviceStats.circuitRejections += 1;
}

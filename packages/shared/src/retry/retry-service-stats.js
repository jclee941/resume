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
  return state.services.get(name);
}

export function addLatency(s, ms) {
  s.totalLatencyMs += ms;
  s.minLatencyMs = Math.min(s.minLatencyMs, ms);
  s.maxLatencyMs = Math.max(s.maxLatencyMs, ms);
}

export function formatServiceStats(s) {
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

export function formatOverallStats(statsState) {
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

import { CircuitState } from './constants.js';
import {
  getOrCreateCircuit,
  getOrCreateServiceStats,
  recordLatency,
  setClosedState,
  setOpenState,
} from './state.js';

export function enterCircuit({ circuits, clock, emit }, serviceName, circuitConfig) {
  const circuit = getOrCreateCircuit(circuits, serviceName);
  const currentTime = clock();

  if (circuit.state === CircuitState.OPEN) {
    if (circuit.resetAt && currentTime >= circuit.resetAt) {
      circuit.state = CircuitState.HALF_OPEN;
      circuit.halfOpenActiveCalls = 0;
      circuit.halfOpenSuccesses = 0;

      emit('circuit:half_open', {
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
}

export function recordSuccess({ circuits, stats, emit }, serviceName, circuitConfig, context) {
  const circuit = getOrCreateCircuit(circuits, serviceName);
  const serviceStats = getOrCreateServiceStats(stats, serviceName);

  stats.totalExecutions += 1;
  stats.totalSuccesses += 1;
  serviceStats.executions += 1;
  serviceStats.successes += 1;
  recordLatency(serviceStats, context.latencyMs);
  circuit.failureCount = 0;

  if (context.fromHalfOpen) {
    circuit.halfOpenActiveCalls = Math.max(0, circuit.halfOpenActiveCalls - 1);
    circuit.halfOpenSuccesses += 1;

    if (circuit.halfOpenSuccesses >= circuitConfig.halfOpenMaxCalls) {
      setClosedState(circuit);
      emit('circuit:closed', {
        serviceName,
        reason: 'recovered',
        state: circuit.state,
      });
    }
  }
}

export function recordFailure(
  { circuits, stats, clock, emit },
  serviceName,
  circuitConfig,
  context
) {
  const circuit = getOrCreateCircuit(circuits, serviceName);
  const serviceStats = getOrCreateServiceStats(stats, serviceName);

  stats.totalExecutions += 1;
  stats.totalFailures += 1;
  serviceStats.executions += 1;
  serviceStats.failures += 1;
  recordLatency(serviceStats, context.latencyMs);
  serviceStats.lastError = {
    name: context.error?.name ?? 'Error',
    message: context.error?.message ?? String(context.error),
    at: new Date(clock()).toISOString(),
  };

  if (context.fromHalfOpen) {
    circuit.halfOpenActiveCalls = Math.max(0, circuit.halfOpenActiveCalls - 1);
    setOpenState(circuit, circuitConfig, clock);
    emit('circuit:open', {
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
    setOpenState(circuit, circuitConfig, clock);
    emit('circuit:open', {
      serviceName,
      reason: 'failure_threshold_reached',
      state: circuit.state,
      openedAt: circuit.openedAt,
      resetAt: circuit.resetAt,
      failureCount: circuit.failureCount,
    });
  }
}

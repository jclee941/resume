const DEGRADED_LATENCY_MS = 2000;

export function evaluateHealth(serviceResults, bindingResults) {
  const services = serviceResults.map((result) => ({
    ...result,
    status_label: getStatusLabel(result),
  }));

  const hasDown = services.some((service) => !service.healthy);
  const hasDegraded = services.some(
    (service) => service.healthy && service.latencyMs > DEGRADED_LATENCY_MS
  );
  const hasBindingFailure = !bindingResults.d1.healthy || !bindingResults.kv.healthy;

  return {
    services,
    bindings: bindingResults,
    overallHealth: getOverallHealth({ hasDown, hasBindingFailure, hasDegraded }),
    hasDown,
    hasDegraded,
    hasBindingFailure,
  };
}

function getOverallHealth({ hasDown, hasBindingFailure, hasDegraded }) {
  if (hasDown || hasBindingFailure) {
    return 'critical';
  }

  if (hasDegraded) {
    return 'degraded';
  }

  return 'healthy';
}

export function getStatusLabel(result) {
  if (!result.healthy) {
    return result.error ? `down (${result.error})` : `error (${result.status})`;
  }

  if (result.latencyMs > DEGRADED_LATENCY_MS) {
    return 'degraded';
  }

  return 'healthy';
}

export function getEscalationLevel(consecutiveFailures) {
  if (consecutiveFailures >= 6) return 'emergency';
  if (consecutiveFailures >= 3) return 'critical';
  if (consecutiveFailures >= 1) return 'warning';
  return 'none';
}

export function isServiceAffected(service) {
  return !service.healthy || service.latencyMs > DEGRADED_LATENCY_MS;
}

/**
 * Browser pool metrics and resource estimates.
 */

export function createPoolMetrics() {
  return {
    created: 0,
    reused: 0,
    released: 0,
    closed: 0,
    queueWaits: 0,
    avgWaitTimeMs: 0,
    totalWaitTimeMs: 0,
  };
}

export function getPoolMetrics(metrics, pool, queue) {
  const entries = Array.from(pool.values());
  return {
    ...metrics,
    poolSize: pool.size,
    inUse: entries.filter((browser) => browser.inUse).length,
    available: entries.filter((browser) => !browser.inUse).length,
    queueLength: queue.length,
  };
}

export function recordQueueWait(metrics, waitTimeMs) {
  metrics.totalWaitTimeMs += waitTimeMs;
  metrics.avgWaitTimeMs = metrics.totalWaitTimeMs / metrics.queueWaits;
}

export function getMemoryEstimate(pool) {
  // Rough estimate: ~100MB per browser instance
  return pool.size * 100;
}

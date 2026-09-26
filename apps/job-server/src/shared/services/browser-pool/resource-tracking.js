/**
 * Browser pool metrics and resource estimates.
 */

/**
 * @typedef {{
 *   created: number;
 *   reused: number;
 *   released: number;
 *   closed: number;
 *   queueWaits: number;
 *   avgWaitTimeMs: number;
 *   totalWaitTimeMs: number;
 * }} PoolMetrics
 *
 * @typedef {{ inUse?: boolean }} PoolBrowser
 */

/**
 * @returns {PoolMetrics}
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

/**
 * @param {PoolMetrics} metrics
 * @param {Map<unknown, PoolBrowser>} pool
 * @param {unknown[]} queue
 */
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

/**
 * @param {PoolMetrics} metrics
 * @param {number} waitTimeMs
 */
export function recordQueueWait(metrics, waitTimeMs) {
  metrics.totalWaitTimeMs += waitTimeMs;
  metrics.avgWaitTimeMs = metrics.totalWaitTimeMs / metrics.queueWaits;
}

/**
 * @param {Map<unknown, unknown>} pool
 */
export function getMemoryEstimate(pool) {
  // Rough estimate: ~100MB per browser instance
  return pool.size * 100;
}

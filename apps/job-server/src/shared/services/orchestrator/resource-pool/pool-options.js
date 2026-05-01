/**
 * Resource pool option normalization and timers.
 *
 * @module orchestrator/resource-pool/pool-options
 */

/**
 * @template T
 * @param {import('./types.js').ResourcePoolOptions<T>} options
 * @returns {import('./types.js').ResourcePoolOptions<T>}
 */
export function normalizePoolOptions(options) {
  const normalized = {
    maxSize: 5,
    minSize: 0,
    acquireTimeoutMs: 30000,
    idleTimeoutMs: 300000,
    maxAge: 600000,
    healthCheckIntervalMs: 60000,
    ...options,
  };

  if (!normalized.create || !normalized.destroy) {
    throw new Error('ResourcePool requires create and destroy functions');
  }

  return normalized;
}

/**
 * @param {() => void} runHealthCheck
 * @param {number} intervalMs
 * @returns {ReturnType<typeof setInterval>|null}
 */
export function startHealthCheckTimer(runHealthCheck, intervalMs) {
  if (intervalMs <= 0) return null;

  const timer = setInterval(runHealthCheck, intervalMs);
  // Don't keep process alive just for health checks
  if (timer.unref) {
    timer.unref();
  }
  return timer;
}

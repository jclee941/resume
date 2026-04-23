import { getGlobalMetricsInstance } from './global-metrics.js';

/**
 * Decorator for timing method calls
 * @param {string} [name] - Custom name (default: method name)
 * @returns {Function}
 */
export function timed(name) {
  return function (_target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || propertyKey;

    descriptor.value = async function (...args) {
      const metrics = this._metrics || getGlobalMetricsInstance();
      if (!metrics) {
        return originalMethod.apply(this, args);
      }

      metrics.mark(metricName);
      try {
        const result = await originalMethod.apply(this, args);
        metrics.measure(metricName, { success: true });
        return result;
      } catch (error) {
        metrics.measure(metricName, { success: false, error: error.message });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Quick timing helper - console.time wrapper
 * @param {string} label
 * @param {Function} fn
 * @returns {Promise<*>}
 */
export async function withTiming(label, fn) {
  console.time(label);
  try {
    return await fn();
  } finally {
    console.timeEnd(label);
  }
}

/**
 * Log memory usage
 * @param {string} [label='Memory']
 * @param {Object} [logger=console]
 */
export function logMemoryUsage(label = 'Memory', logger = console) {
  const usage = process.memoryUsage();
  logger.log(
    `${label}: ${Math.round(usage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(
      usage.rss / 1024 / 1024
    )}MB RSS`
  );
}

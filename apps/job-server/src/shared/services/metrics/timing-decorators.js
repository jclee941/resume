/**
 * @typedef {{
 *   mark(name: string): void;
 *   measure(name: string, data: Record<string, unknown>): void;
 *   [key: string]: unknown;
 * }} TimingMetrics
 */

/**
 * Decorator for timing method calls
 * @param {string} [name] - Custom name (default: method name)
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor}
 */
export function timed(name) {
  return function (_target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || String(propertyKey);

    /**
     * @this {{ _metrics?: TimingMetrics; [key: string]: unknown }}
     * @param {unknown[]} args
     */
    descriptor.value = async function (...args) {
      const metrics = this._metrics;
      if (!metrics) {
        return originalMethod.apply(this, args);
      }

      metrics.mark(metricName);
      try {
        const result = await originalMethod.apply(this, args);
        metrics.measure(metricName, { success: true });
        return result;
      } catch (error) {
        metrics.measure(metricName, {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Quick timing helper - console.time wrapper
 * @template T
 * @param {string} label
 * @param {() => Promise<T> | T} fn
 * @returns {Promise<T>}
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
 * @param {{ log: (...data: unknown[]) => void }} [logger=console]
 */
export function logMemoryUsage(label = 'Memory', logger = console) {
  const usage = process.memoryUsage();
  logger.log(
    `${label}: ${Math.round(usage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(
      usage.rss / 1024 / 1024
    )}MB RSS`
  );
}

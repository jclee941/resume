/**
 * Performance Metrics - Profiling and monitoring utilities
 *
 * Provides timing, memory tracking, and performance profiling
 * for the auto-apply system.
 */

import { EventEmitter } from 'events';

/**
 * @typedef {Object} TimingMark
 * @property {string} name
 * @property {number} startTime
 * @property {number} [endTime]
 * @property {number} [duration]
 * @property {Object} [metadata]
 */

/**
 * @typedef {Object} PerformanceSnapshot
 * @property {number} timestamp
 * @property {number} memoryUsedMB
 * @property {number} memoryTotalMB
 * @property {number} cpuUsagePercent
 * @property {Object} timings
 * @property {Object} counters
 */

export class PerformanceMetrics extends EventEmitter {
  #marks = new Map();
  #measures = [];
  #counters = new Map();
  #gauges = new Map();
  #histograms = new Map();
  #startTime = Date.now();
  #logger;
  #enabled = true;
  #samplingInterval = null;

  constructor(options = {}) {
    super();
    this.#logger = options.logger || console;
    this.#enabled = options.enabled !== false;
  }

  /**
   * Enable metrics collection
   */
  enable() {
    this.#enabled = true;
  }

  /**
   * Disable metrics collection
   */
  disable() {
    this.#enabled = false;
  }

  /**
   * Start a timing mark
   * @param {string} name
   * @param {Object} [metadata]
   */
  mark(name, metadata = {}) {
    if (!this.#enabled) return;

    const mark = {
      name,
      startTime: performance.now(),
      metadata,
    };

    this.#marks.set(name, mark);
    this.emit('mark', mark);
  }

  /**
   * End a timing mark and calculate duration
   * @param {string} name
   * @param {Object} [metadata]
   * @returns {number} Duration in ms
   */
  measure(name, metadata = {}) {
    if (!this.#enabled) return 0;

    const mark = this.#marks.get(name);
    if (!mark) {
      this.#logger.warn(`No mark found for: ${name}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - mark.startTime;

    const measure = {
      name,
      startTime: mark.startTime,
      endTime,
      duration,
      metadata: { ...mark.metadata, ...metadata },
    };

    this.#measures.push(measure);
    this.#marks.delete(name);

    this.emit('measure', measure);

    // Log slow operations
    if (duration > 5000) {
      this.#logger.warn(`Slow operation: ${name} took ${Math.round(duration)}ms`);
    }

    return duration;
  }

  /**
   * Time a function execution
   * @param {string} name
   * @param {Function} fn
   * @param {*} [context]
   * @param {...*} args
   * @returns {Promise<*>}
   */
  async timeAsync(name, fn, context, ...args) {
    this.mark(name);
    try {
      const result = await fn.apply(context, args);
      this.measure(name, { success: true });
      return result;
    } catch (error) {
      this.measure(name, { success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Time a synchronous function
   * @param {string} name
   * @param {Function} fn
   * @param {*} [context]
   * @param {...*} args
   * @returns {*}
   */
  timeSync(name, fn, context, ...args) {
    this.mark(name);
    try {
      const result = fn.apply(context, args);
      this.measure(name, { success: true });
      return result;
    } catch (error) {
      this.measure(name, { success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Increment a counter
   * @param {string} name
   * @param {number} [value=1]
   */
  increment(name, value = 1) {
    if (!this.#enabled) return;

    const current = this.#counters.get(name) || 0;
    this.#counters.set(name, current + value);
  }

  /**
   * Set a gauge value
   * @param {string} name
   * @param {number} value
   */
  gauge(name, value) {
    if (!this.#enabled) return;

    this.#gauges.set(name, value);
  }

  /**
   * Record a histogram value
   * @param {string} name
   * @param {number} value
   */
  histogram(name, value) {
    if (!this.#enabled) return;

    if (!this.#histograms.has(name)) {
      this.#histograms.set(name, []);
    }

    const values = this.#histograms.get(name);
    values.push(value);

    // Keep last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
  }

  /**
   * Get current memory usage
   * @returns {Object}
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
    };
  }

  /**
   * Get performance summary
   * @returns {Object}
   */
  getSummary() {
    const summary = {
      runtime: Date.now() - this.#startTime,
      memory: this.getMemoryUsage(),
      counters: Object.fromEntries(this.#counters),
      gauges: Object.fromEntries(this.#gauges),
      timings: this.#calculateTimingStats(),
      histograms: this.#calculateHistogramStats(),
    };

    return summary;
  }

  /**
   * Get all measures for a specific name
   * @param {string} namePattern
   * @returns {Array}
   */
  getMeasures(namePattern) {
    const regex = new RegExp(namePattern);
    return this.#measures.filter((m) => regex.test(m.name));
  }

  /**
   * Get average duration for a measure pattern
   * @param {string} namePattern
   * @returns {number}
   */
  getAverageDuration(namePattern) {
    const measures = this.getMeasures(namePattern);
    if (measures.length === 0) return 0;

    const total = measures.reduce((sum, m) => sum + m.duration, 0);
    return total / measures.length;
  }

  /**
   * Get percentile for a histogram
   * @param {string} name
   * @param {number} percentile - 0-100
   * @returns {number}
   */
  getPercentile(name, percentile) {
    const values = this.#histograms.get(name);
    if (!values || values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Start sampling memory usage
   * @param {number} intervalMs
   */
  startSampling(intervalMs = 5000) {
    if (this.#samplingInterval) {
      clearInterval(this.#samplingInterval);
    }

    this.#samplingInterval = setInterval(() => {
      const mem = this.getMemoryUsage();
      this.gauge('memory.heapUsed', mem.heapUsed);
      this.gauge('memory.rss', mem.rss);

      this.emit('sample', { type: 'memory', value: mem });
    }, intervalMs);
    this.#samplingInterval.unref?.();
  }

  /**
   * Stop sampling
   */
  stopSampling() {
    if (this.#samplingInterval) {
      clearInterval(this.#samplingInterval);
      this.#samplingInterval = null;
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.#marks.clear();
    this.#measures = [];
    this.#counters.clear();
    this.#gauges.clear();
    this.#histograms.clear();
    this.#startTime = Date.now();
  }

  /**
   * Log current metrics summary
   */
  logSummary() {
    const summary = this.getSummary();

    this.#logger.info('=== Performance Summary ===');
    this.#logger.info(`Runtime: ${(summary.runtime / 1000).toFixed(2)}s`);
    this.#logger.info(`Memory: ${summary.memory.heapUsed}MB / ${summary.memory.heapTotal}MB`);

    if (Object.keys(summary.counters).length > 0) {
      this.#logger.info('Counters:', summary.counters);
    }

    if (Object.keys(summary.timings).length > 0) {
      this.#logger.info('Timings:');
      for (const [name, stats] of Object.entries(summary.timings)) {
        this.#logger.info(
          `  ${name}: avg=${stats.avg.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, count=${stats.count}`
        );
      }
    }
  }

  /**
   * Calculate timing statistics
   * @returns {Object}
   */
  #calculateTimingStats() {
    const byName = new Map();

    for (const measure of this.#measures) {
      if (!byName.has(measure.name)) {
        byName.set(measure.name, []);
      }
      byName.get(measure.name).push(measure.duration);
    }

    const stats = {};
    for (const [name, durations] of byName) {
      const sorted = durations.sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);

      stats[name] = {
        count: sorted.length,
        avg: sum / sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
        p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1],
      };
    }

    return stats;
  }

  /**
   * Calculate histogram statistics
   * @returns {Object}
   */
  #calculateHistogramStats() {
    const stats = {};

    for (const [name, values] of this.#histograms) {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);

      stats[name] = {
        count: sorted.length,
        avg: sum / sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
        p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1],
      };
    }

    return stats;
  }
}

/**
 * Decorator for timing method calls
 * @param {string} [name] - Custom name (default: method name)
 * @returns {Function}
 */
export function timed(name) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || propertyKey;

    descriptor.value = async function (...args) {
      const metrics = this._metrics || globalMetrics;
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

// Global metrics instance
let globalMetrics = null;

/**
 * Get or create global metrics instance
 * @param {Object} options
 * @returns {PerformanceMetrics}
 */
export function getMetrics(options = {}) {
  if (!globalMetrics) {
    globalMetrics = new PerformanceMetrics(options);
  }
  return globalMetrics;
}

/**
 * Reset global metrics
 */
export function resetMetrics() {
  if (globalMetrics) {
    globalMetrics.stopSampling();
    globalMetrics = null;
  }
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

export default PerformanceMetrics;

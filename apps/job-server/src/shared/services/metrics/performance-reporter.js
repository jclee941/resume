import { PerformanceMetricsCore } from './performance-core.js';

export class PerformanceMetrics extends PerformanceMetricsCore {
  constructor(options = {}) {
    super(options);
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
    };
  }

  getSummary() {
    return {
      runtime: Date.now() - this._startTime,
      memory: this.getMemoryUsage(),
      counters: Object.fromEntries(this._counters),
      gauges: Object.fromEntries(this._gauges),
      timings: this.#calculateTimingStats(),
      histograms: this.#calculateHistogramStats(),
    };
  }

  getMeasures(namePattern) {
    const regex = new RegExp(namePattern);
    return this._measures.filter((m) => regex.test(m.name));
  }

  getAverageDuration(namePattern) {
    const measures = this.getMeasures(namePattern);
    if (measures.length === 0) return 0;

    const total = measures.reduce((sum, m) => sum + m.duration, 0);
    return total / measures.length;
  }

  getPercentile(name, percentile) {
    const values = this._histograms.get(name);
    if (!values || values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  startSampling(intervalMs = 5000) {
    if (this._samplingInterval) {
      clearInterval(this._samplingInterval);
    }

    this._samplingInterval = setInterval(() => {
      const mem = this.getMemoryUsage();
      this.gauge('memory.heapUsed', mem.heapUsed);
      this.gauge('memory.rss', mem.rss);
      this.emit('sample', { type: 'memory', value: mem });
    }, intervalMs);

    this._samplingInterval.unref?.();
  }

  stopSampling() {
    if (this._samplingInterval) {
      clearInterval(this._samplingInterval);
      this._samplingInterval = null;
    }
  }

  logSummary() {
    const summary = this.getSummary();

    this._logger.info('=== Performance Summary ===');
    this._logger.info(`Runtime: ${(summary.runtime / 1000).toFixed(2)}s`);
    this._logger.info(`Memory: ${summary.memory.heapUsed}MB / ${summary.memory.heapTotal}MB`);

    if (Object.keys(summary.counters).length > 0) {
      this._logger.info('Counters:', summary.counters);
    }

    if (Object.keys(summary.timings).length > 0) {
      this._logger.info('Timings:');
      for (const [name, stats] of Object.entries(summary.timings)) {
        this._logger.info(
          `  ${name}: avg=${stats.avg.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, count=${stats.count}`
        );
      }
    }
  }

  #calculateTimingStats() {
    const byName = new Map();

    for (const measure of this._measures) {
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

  #calculateHistogramStats() {
    const stats = {};

    for (const [name, values] of this._histograms) {
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

export default PerformanceMetrics;

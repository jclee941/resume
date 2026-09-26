import { EventEmitter } from 'events';

/**
 * @typedef {Object} PerformanceMark
 * @property {string} name
 * @property {number} startTime
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {Object} PerformanceMeasure
 * @property {string} name
 * @property {number} startTime
 * @property {number} endTime
 * @property {number} duration
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {Object} PerformanceLogger
 * @property {(message: string) => void} warn
 * @property {(...args: unknown[]) => void} [error]
 * @property {(...args: unknown[]) => void} [info]
 */

/**
 * @typedef {Object} PerformanceMetricsOptions
 * @property {PerformanceLogger} [logger]
 * @property {boolean} [enabled]
 */

/**
 * Performance metrics core collector
 */
export class PerformanceMetricsCore extends EventEmitter {
  /** @type {Map<string, PerformanceMark>} */
  _marks;
  /** @type {PerformanceMeasure[]} */
  _measures;
  /** @type {Map<string, number>} */
  _counters;
  /** @type {Map<string, number>} */
  _gauges;
  /** @type {Map<string, number[]>} */
  _histograms;
  /** @type {number} */
  _startTime;
  /** @type {PerformanceLogger} */
  _logger;
  /** @type {boolean} */
  _enabled;
  /** @type {NodeJS.Timeout | number | null} */
  _samplingInterval;

  /**
   * @param {PerformanceMetricsOptions} [options]
   */
  constructor(options = {}) {
    super();
    this._marks = new Map();
    this._measures = [];
    this._counters = new Map();
    this._gauges = new Map();
    this._histograms = new Map();
    this._startTime = Date.now();
    this._logger = options.logger || console;
    this._enabled = options.enabled !== false;
    this._samplingInterval = null;
  }

  enable() {
    this._enabled = true;
  }

  disable() {
    this._enabled = false;
  }

  /**
   * @param {string} name
   * @param {Record<string, unknown>} [metadata]
   */
  mark(name, metadata = {}) {
    if (!this._enabled) return;

    const mark = {
      name,
      startTime: performance.now(),
      metadata,
    };

    this._marks.set(name, mark);
    this.emit('mark', mark);
  }

  /**
   * @param {string} name
   * @param {Record<string, unknown>} [metadata]
   * @returns {number}
   */
  measure(name, metadata = {}) {
    if (!this._enabled) return 0;

    const mark = this._marks.get(name);
    if (!mark) {
      this._logger.warn(`No mark found for: ${name}`);
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

    this._measures.push(measure);
    this._marks.delete(name);
    this.emit('measure', measure);

    if (duration > 5000) {
      this._logger.warn(`Slow operation: ${name} took ${Math.round(duration)}ms`);
    }

    return duration;
  }

  /**
   * @template T
   * @param {string} name
   * @param {(...args: unknown[]) => T | Promise<T>} fn
   * @param {unknown} [context]
   * @param {...unknown} args
   * @returns {Promise<T>}
   */
  async timeAsync(name, fn, context, ...args) {
    this.mark(name);
    try {
      const result = await fn.apply(context, args);
      this.measure(name, { success: true });
      return result;
    } catch (error) {
      this.measure(name, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * @param {string} name
   * @param {number} [value]
   */
  increment(name, value = 1) {
    if (!this._enabled) return;

    const current = this._counters.get(name) || 0;
    this._counters.set(name, current + value);
  }

  /**
   * @param {string} name
   * @param {number} value
   */
  gauge(name, value) {
    if (!this._enabled) return;
    this._gauges.set(name, value);
  }

  /**
   * @param {string} name
   * @param {number} value
   */
  histogram(name, value) {
    if (!this._enabled) return;

    if (!this._histograms.has(name)) {
      this._histograms.set(name, []);
    }

    const values = /** @type {number[]} */ (this._histograms.get(name));
    values.push(value);

    if (values.length > 1000) {
      values.shift();
    }
  }

  reset() {
    this._marks.clear();
    this._measures = [];
    this._counters.clear();
    this._gauges.clear();
    this._histograms.clear();
    this._startTime = Date.now();
  }
}

export default PerformanceMetricsCore;

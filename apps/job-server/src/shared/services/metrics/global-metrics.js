/**
 * @file PerformanceMetrics factory. Construct one instance per logical scope and
 * inject it through constructors (no module-level singleton).
 */
import { PerformanceMetrics } from './performance-reporter.js';

/**
 * Create a fresh PerformanceMetrics instance. Always returns a new object.
 * @param {Object} [config]
 * @returns {PerformanceMetrics}
 */
export function createGlobalMetrics(config = {}) {
  return new PerformanceMetrics(config);
}

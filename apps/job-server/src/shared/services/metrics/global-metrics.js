import { PerformanceMetrics } from './performance-reporter.js';

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

export function getGlobalMetricsInstance() {
  return globalMetrics;
}

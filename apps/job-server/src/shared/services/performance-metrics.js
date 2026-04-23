/**
 * Performance Metrics - Compatibility barrel
 *
 * Re-exports metrics modules from ./metrics while preserving
 * backward-compatible imports from this original path.
 */

export { PerformanceMetricsCore } from './metrics/performance-core.js';
export { PerformanceMetrics } from './metrics/performance-reporter.js';
export { getMetrics, resetMetrics } from './metrics/global-metrics.js';
export { timed, withTiming, logMemoryUsage } from './metrics/timing-decorators.js';

export { PerformanceMetrics as default } from './metrics/performance-reporter.js';

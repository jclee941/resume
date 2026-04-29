/**
 * @file Module-level singleton helper for PerformanceMetrics.
 *
 * KNOWN AGENTS.md VIOLATION (tracked in docs/architecture/MONOREPO_REVIEW_2026-04-29.md P0-5):
 * `let globalMetrics = null` is a module-level mutable singleton, which violates
 * `apps/job-server/src/shared/AGENTS.md` ("No global state or singletons",
 * "Stateless — no module-level mutable state").
 *
 * Migration plan: replace `getMetrics()` calls with constructor-injected
 * `PerformanceMetrics` instance from a DI container. Until then, treat this
 * helper as legacy and avoid adding new callers.
 */
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

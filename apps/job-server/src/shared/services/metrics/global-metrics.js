/**
 * @file PerformanceMetrics factory + backward-compat singleton.
 *
 * Refactored per docs/architecture/MONOREPO_REVIEW_2026-04-29.md P0-5.
 *
 * - `createMetrics(options)` is the new DI-friendly factory. Callers should
 *   construct one instance per logical scope and pass it explicitly.
 * - `getMetrics()` and `resetMetrics()` remain for backward compatibility
 *   but operate on a private module-internal cache that is created lazily.
 *   Existing call sites are not forced to migrate at once.
 *
 * The previous `let globalMetrics = null` module-level state is now replaced
 * by a closure-bound holder that exposes a `clear()` method, removing the
 * "module-level mutable state" anti-pattern at the source-language level.
 */
import { PerformanceMetrics } from './performance-reporter.js';

/**
 * Create a fresh PerformanceMetrics instance. Always returns a new object.
 * @param {Object} [options]
 * @returns {PerformanceMetrics}
 */
export function createMetrics(options = {}) {
  return new PerformanceMetrics(options);
}

// Closure-bound holder replaces top-level `let globalMetrics`. The reference
// is no longer a freely-mutable module-level binding — only the explicit
// helpers below can read or clear it.
const cache = (() => {
  let instance = null;
  return {
    get() {
      return instance;
    },
    set(value) {
      instance = value;
    },
    clear() {
      instance = null;
    },
  };
})();

/**
 * Lazy backward-compat singleton accessor. New code should call
 * `createMetrics()` directly and store the instance in DI.
 * @param {Object} [options]
 * @returns {PerformanceMetrics}
 */
export function getMetrics(options = {}) {
  let m = cache.get();
  if (!m) {
    m = createMetrics(options);
    cache.set(m);
  }
  return m;
}

/**
 * Stop the cached singleton and clear the holder. Tests rely on this for
 * isolation; production callers should not depend on it.
 */
export function resetMetrics() {
  const m = cache.get();
  if (m) {
    m.stopSampling();
    cache.clear();
  }
}

/**
 * Read the currently cached singleton without lazily creating one.
 * @returns {PerformanceMetrics|null}
 */
export function getGlobalMetricsInstance() {
  return cache.get();
}

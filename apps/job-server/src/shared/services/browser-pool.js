/**
 * Browser pool public API.
 *
 * Kept as a barrel export for backward compatibility with existing imports.
 */

import { BrowserPool } from './browser-pool/pool-manager.js';

export { BrowserPool } from './browser-pool/pool-manager.js';

/**
 * Create an isolated browser pool for constructor-injected services.
 * @param {Object} [config] - Browser pool configuration.
 * @returns {BrowserPool}
 */
export function createBrowserPool(config = {}) {
  return new BrowserPool(config);
}

// Deprecated singleton compatibility layer.
// DEPRECATED: Prefer createBrowserPool() and pass the instance through constructors.
// Singleton exports remain temporarily for existing imports and tests.
// Migration: docs/architecture/MONOREPO_REVIEW_2026-04-29.md (singleton DI plan).
const _globalPoolHolder = (() => {
  let value = null;
  return {
    get: () => value,
    set: (nextValue) => {
      value = nextValue;
    },
    clear: () => {
      value = null;
    },
  };
})();

/**
 * Get or create global browser pool
 * @param {Object} options
 * @deprecated Use createBrowserPool() and inject the returned instance through constructors.
 * @returns {BrowserPool}
 */
export function getBrowserPool(options = {}) {
  if (!_globalPoolHolder.get()) {
    _globalPoolHolder.set(createBrowserPool(options));
  }
  return _globalPoolHolder.get();
}

/**
 * Reset global browser pool (for testing)
 * @deprecated Use createBrowserPool() and inject the returned instance through constructors.
 */
export function resetBrowserPool() {
  if (_globalPoolHolder.get()) {
    _globalPoolHolder
      .get()
      .closeAll()
      .catch(() => {});
    _globalPoolHolder.clear();
  }
}

export default BrowserPool;

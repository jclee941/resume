import { LazyCrawlerRegistry } from './lazy-crawler-registry.js';

const _globalRegistryHolder = (() => {
  let v = null;
  return {
    get: () => v,
    set: (x) => {
      v = x;
    },
    clear: () => {
      v = null;
    },
  };
})();

/**
 * Create an isolated crawler registry for constructor-injected dependencies.
 * @param {object} [options]
 * @returns {LazyCrawlerRegistry}
 */
function createRegistry(options = {}) {
  return new LazyCrawlerRegistry(options);
}

/**
 * DEPRECATED: compatibility singleton for legacy imports. Prefer createRegistry()
 * and pass the registry through constructors; singleton exports are planned for
 * removal when lazy-loader callers are DI-only.
 * @returns {LazyCrawlerRegistry}
 */
function getRegistry() {
  if (!_globalRegistryHolder.get()) {
    _globalRegistryHolder.set(createRegistry());
  }
  return _globalRegistryHolder.get();
}

/**
 * DEPRECATED: compatibility alias for legacy crawler-registry imports. Prefer
 * createRegistry() with constructor-injected dependencies.
 * @returns {LazyCrawlerRegistry}
 */
export const getCrawlerRegistry = getRegistry;

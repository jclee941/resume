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
export function createRegistry(options = {}) {
  return new LazyCrawlerRegistry(options);
}

/**
 * DEPRECATED: compatibility singleton for legacy imports. Prefer createRegistry()
 * and pass the registry through constructors; singleton exports are planned for
 * removal when lazy-loader callers are DI-only.
 * @returns {LazyCrawlerRegistry}
 */
export function getRegistry() {
  if (!_globalRegistryHolder.get()) {
    _globalRegistryHolder.set(createRegistry());
  }
  return _globalRegistryHolder.get();
}

/**
 * DEPRECATED: compatibility singleton override for legacy tests/bootstrap. Prefer
 * constructor-injected registries from createRegistry(); singleton exports are
 * planned for removal when lazy-loader callers are DI-only.
 * @param {LazyCrawlerRegistry|null} registry
 * @returns {void}
 */
export function setRegistry(registry) {
  if (registry === null) {
    _globalRegistryHolder.clear();
    return;
  }
  _globalRegistryHolder.set(registry);
}

/**
 * DEPRECATED: compatibility alias for legacy crawler-registry imports. Prefer
 * createRegistry() with constructor-injected dependencies.
 * @returns {LazyCrawlerRegistry}
 */
export const getCrawlerRegistry = getRegistry;

/**
 * DEPRECATED: compatibility alias for legacy crawler-registry overrides. Prefer
 * createRegistry() with constructor-injected dependencies.
 * @param {LazyCrawlerRegistry|null} registry
 * @returns {void}
 */
export const setCrawlerRegistry = setRegistry;

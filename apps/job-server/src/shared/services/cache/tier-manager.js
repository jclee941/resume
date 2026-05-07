import { LRUCache } from './lru-cache.js';

/**
 * Typed cache namespaces for different data types.
 */
export class TypedCache {
  #caches = new Map();
  #defaultOptions;

  constructor(defaultOptions = {}) {
    this.#defaultOptions = defaultOptions;
  }

  /**
   * Get or create namespaced cache.
   * @param {string} namespace
   * @param {Object} [options] - Override default options
   * @returns {LRUCache}
   */
  namespace(namespace, options = {}) {
    if (!this.#caches.has(namespace)) {
      this.#caches.set(namespace, new LRUCache({ ...this.#defaultOptions, ...options }));
    }
    return this.#caches.get(namespace);
  }

  /** @returns {LRUCache} Job details cache (TTL: 1 hour). */
  jobs() {
    return this.namespace('jobs', { maxSize: 500, defaultTTL: 3600000 });
  }

  /** @returns {LRUCache} Company info cache (TTL: 24 hours). */
  companies() {
    return this.namespace('companies', { maxSize: 200, defaultTTL: 86400000 });
  }

  /** @returns {LRUCache} Profile data cache (TTL: session - no expiration). */
  profiles() {
    return this.namespace('profiles', { maxSize: 50, defaultTTL: 0 });
  }

  /** @returns {LRUCache} Search results cache (TTL: 30 minutes). */
  searchResults() {
    return this.namespace('search', { maxSize: 100, defaultTTL: 1800000 });
  }

  /**
   * Get all cache statistics.
   * @returns {Object}
   */
  getAllStats() {
    const stats = {};
    for (const [name, cache] of this.#caches) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  /** Clear all caches. */
  clearAll() {
    for (const cache of this.#caches.values()) {
      cache.clear();
    }
  }

  /** Destroy all caches. */
  destroy() {
    for (const cache of this.#caches.values()) {
      cache.destroy();
    }
    this.#caches.clear();
  }
}

/**
 * Create an isolated typed cache instance for constructor-injected services.
 * @param {Object} [defaultOptions] - Default options passed to each namespaced LRUCache.
 * @returns {TypedCache}
 */
export function createCache(defaultOptions = {}) {
  return new TypedCache(defaultOptions);
}

const _globalCacheHolder = (() => {
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
 * Get or create global typed cache.
 * @deprecated Use createCache() and inject the returned instance through constructors.
 * @returns {TypedCache}
 */
export function getGlobalCache() {
  if (!_globalCacheHolder.get()) {
    _globalCacheHolder.set(createCache());
  }
  return _globalCacheHolder.get();
}

/**
 * Replace global typed cache (for legacy tests and compatibility wiring).
 * @deprecated Use createCache() and inject the returned instance through constructors.
 * @param {TypedCache|null} cache
 * @returns {TypedCache|null}
 */
export function setGlobalCache(cache) {
  if (_globalCacheHolder.get() && _globalCacheHolder.get() !== cache) {
    _globalCacheHolder.get().destroy();
  }
  _globalCacheHolder.set(cache);
  return cache;
}

/**
 * Reset global cache (for testing).
 * @deprecated Use createCache() and inject the returned instance through constructors.
 */
export function resetGlobalCache() {
  if (_globalCacheHolder.get()) {
    _globalCacheHolder.get().destroy();
    _globalCacheHolder.clear();
  }
}

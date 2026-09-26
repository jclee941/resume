import { LRUCache } from './lru-cache.js';

/**
 * @typedef {object} CacheOptions
 * @property {number} [maxSize]
 * @property {number} [defaultTTL]
 * @property {boolean} [autoCleanup]
 * @property {number} [cleanupIntervalMs]
 */

/**
 * Typed cache namespaces for different data types.
 */
export class TypedCache {
  /** @type {Map<string, LRUCache>} */
  #caches = new Map();
  /** @type {CacheOptions} */
  #defaultOptions;

  /**
   * @param {CacheOptions} [defaultOptions]
   */
  constructor(defaultOptions = {}) {
    this.#defaultOptions = defaultOptions;
  }

  /**
   * Get or create namespaced cache.
   * @param {string} namespace
   * @param {CacheOptions} [options] - Override default options
   * @returns {LRUCache}
   */
  namespace(namespace, options = {}) {
    if (!this.#caches.has(namespace)) {
      this.#caches.set(namespace, new LRUCache({ ...this.#defaultOptions, ...options }));
    }
    return /** @type {LRUCache} */ (this.#caches.get(namespace));
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
   * @returns {Record<string, import('./lru-cache.js').CacheStats>}
   */
  getAllStats() {
    /** @type {Record<string, import('./lru-cache.js').CacheStats>} */
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
 * @param {CacheOptions} [defaultOptions] - Default options passed to each namespaced LRUCache.
 * @returns {TypedCache}
 */
export function createCache(defaultOptions = {}) {
  return new TypedCache(defaultOptions);
}

/**
 * LRU Cache - In-memory caching with TTL support
 *
 * Provides size-limited caching with least-recently-used eviction
 * and time-to-live expiration for job data, company info, and profiles.
 */

/**
 * @typedef {Object} CacheEntry
 * @property {*} value
 * @property {number} expiresAt - Timestamp (0 = no expiration)
 * @property {number} lastAccessed
 * @property {number} accessCount
 */

/**
 * @typedef {Object} CacheStats
 * @property {number} size - Current cache size
 * @property {number} maxSize - Maximum allowed size
 * @property {number} hits - Cache hit count
 * @property {number} misses - Cache miss count
 * @property {number} evictions - Eviction count
 * @property {number} expirations - Expiration count
 * @property {number} hitRate - Hit rate (0-1)
 */

export class LRUCache {
  #cache = new Map();
  #maxSize;
  #defaultTTL;
  #stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  };
  #cleanupInterval;

  /**
   * @param {Object} options
   * @param {number} [options.maxSize=1000] - Maximum number of entries
   * @param {number} [options.defaultTTL=0] - Default TTL in ms (0 = no expiration)
   * @param {boolean} [options.autoCleanup=true] - Enable automatic cleanup
   * @param {number} [options.cleanupIntervalMs=60000] - Cleanup interval
   */
  constructor(options = {}) {
    this.#maxSize = options.maxSize || 1000;
    this.#defaultTTL = options.defaultTTL || 0;

    if (options.autoCleanup !== false) {
      this.#cleanupInterval = setInterval(() => this.cleanup(), options.cleanupIntervalMs || 60000);
    }
  }

  /**
   * Get value from cache
   * @param {string} key
   * @returns {*} Value or undefined
   */
  get(key) {
    const entry = this.#cache.get(key);

    if (!entry) {
      this.#stats.misses++;
      return undefined;
    }

    // Check expiration
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.#cache.delete(key);
      this.#stats.expirations++;
      this.#stats.misses++;
      return undefined;
    }

    // Update access metadata
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    // Move to end (most recently used)
    this.#cache.delete(key);
    this.#cache.set(key, entry);

    this.#stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key
   * @param {*} value
   * @param {number} [ttl] - TTL in ms (overrides default)
   * @returns {LRUCache} This instance for chaining
   */
  set(key, value, ttl) {
    // Evict oldest if at capacity
    if (this.#cache.size >= this.#maxSize && !this.#cache.has(key)) {
      this.#evictLRU();
    }

    // Remove existing entry
    if (this.#cache.has(key)) {
      this.#cache.delete(key);
    }

    const effectiveTTL = ttl !== undefined ? ttl : this.#defaultTTL;

    const entry = {
      value,
      expiresAt: effectiveTTL > 0 ? Date.now() + effectiveTTL : 0,
      lastAccessed: Date.now(),
      accessCount: 1,
    };

    this.#cache.set(key, entry);
    return this;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.#cache.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.#cache.delete(key);
      this.#stats.expirations++;
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   * @param {string} key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    return this.#cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear() {
    this.#cache.clear();
    this.#stats.hits = 0;
    this.#stats.misses = 0;
    this.#stats.evictions = 0;
    this.#stats.expirations = 0;
  }

  /**
   * Get cache statistics
   * @returns {CacheStats}
   */
  getStats() {
    const total = this.#stats.hits + this.#stats.misses;
    return {
      size: this.#cache.size,
      maxSize: this.#maxSize,
      hits: this.#stats.hits,
      misses: this.#stats.misses,
      evictions: this.#stats.evictions,
      expirations: this.#stats.expirations,
      hitRate: total > 0 ? this.#stats.hits / total : 0,
    };
  }

  /**
   * Get all keys (non-expired only)
   * @returns {string[]}
   */
  keys() {
    const keys = [];
    const now = Date.now();

    for (const [key, entry] of this.#cache) {
      if (entry.expiresAt === 0 || now <= entry.expiresAt) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Get cache size
   * @returns {number}
   */
  get size() {
    return this.#cache.size;
  }

  /**
   * Cleanup expired entries
   * @returns {number} Number of entries removed
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.#cache) {
      if (entry.expiresAt > 0 && now > entry.expiresAt) {
        this.#cache.delete(key);
        removed++;
        this.#stats.expirations++;
      }
    }

    return removed;
  }

  /**
   * Stop automatic cleanup
   */
  destroy() {
    if (this.#cleanupInterval) {
      clearInterval(this.#cleanupInterval);
      this.#cleanupInterval = null;
    }
  }

  /**
   * Evict least recently used entry
   */
  #evictLRU() {
    const firstKey = this.#cache.keys().next().value;
    if (firstKey !== undefined) {
      this.#cache.delete(firstKey);
      this.#stats.evictions++;
    }
  }

  /**
   * Get or compute value
   * @param {string} key
   * @param {Function} factory - Async factory function
   * @param {number} [ttl] - TTL in ms
   * @returns {Promise<*>}
   */
  async getOrSet(key, factory, ttl) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

/**
 * Typed cache namespaces for different data types
 */
export class TypedCache {
  #caches = new Map();
  #defaultOptions;

  constructor(defaultOptions = {}) {
    this.#defaultOptions = defaultOptions;
  }

  /**
   * Get or create namespaced cache
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

  /**
   * Get job details cache (TTL: 1 hour)
   * @returns {LRUCache}
   */
  jobs() {
    return this.namespace('jobs', { maxSize: 500, defaultTTL: 3600000 });
  }

  /**
   * Get company info cache (TTL: 24 hours)
   * @returns {LRUCache}
   */
  companies() {
    return this.namespace('companies', { maxSize: 200, defaultTTL: 86400000 });
  }

  /**
   * Get profile data cache (TTL: session - no expiration)
   * @returns {LRUCache}
   */
  profiles() {
    return this.namespace('profiles', { maxSize: 50, defaultTTL: 0 });
  }

  /**
   * Get search results cache (TTL: 30 minutes)
   * @returns {LRUCache}
   */
  searchResults() {
    return this.namespace('search', { maxSize: 100, defaultTTL: 1800000 });
  }

  /**
   * Get all cache statistics
   * @returns {Object}
   */
  getAllStats() {
    const stats = {};
    for (const [name, cache] of this.#caches) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  /**
   * Clear all caches
   */
  clearAll() {
    for (const cache of this.#caches.values()) {
      cache.clear();
    }
  }

  /**
   * Destroy all caches
   */
  destroy() {
    for (const cache of this.#caches.values()) {
      cache.destroy();
    }
    this.#caches.clear();
  }
}

// Global typed cache instance
let globalCache = null;

/**
 * Get or create global typed cache
 * @returns {TypedCache}
 */
export function getGlobalCache() {
  if (!globalCache) {
    globalCache = new TypedCache();
  }
  return globalCache;
}

/**
 * Reset global cache (for testing)
 */
export function resetGlobalCache() {
  if (globalCache) {
    globalCache.destroy();
    globalCache = null;
  }
}

export default LRUCache;

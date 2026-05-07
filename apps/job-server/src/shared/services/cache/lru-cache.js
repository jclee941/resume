/**
 * LRU Cache - In-memory caching with TTL support.
 */

import {
  clearValues,
  deleteValue,
  getOrSetValue,
  getValue,
  hasValue,
  setValue,
} from './cache-operations.js';
import { activeKeys, cleanupExpired } from './eviction-policy.js';

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
  #state;
  #cleanupInterval;

  /**
   * @param {Object} options
   * @param {number} [options.maxSize=1000] - Maximum number of entries
   * @param {number} [options.defaultTTL=0] - Default TTL in ms (0 = no expiration)
   * @param {boolean} [options.autoCleanup=true] - Enable automatic cleanup
   * @param {number} [options.cleanupIntervalMs=60000] - Cleanup interval
   */
  constructor(options = {}) {
    this.#state = {
      cache: new Map(),
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 0,
      stats: { hits: 0, misses: 0, evictions: 0, expirations: 0 },
    };

    if (options.autoCleanup !== false) {
      this.#cleanupInterval = setInterval(() => this.cleanup(), options.cleanupIntervalMs || 60000);
      this.#cleanupInterval.unref?.();
    }
  }

  get(key) {
    return getValue(this.#state, key);
  }

  set(key, value, ttl) {
    setValue(this.#state, key, value, ttl);
    return this;
  }

  has(key) {
    return hasValue(this.#state, key);
  }

  delete(key) {
    return deleteValue(this.#state, key);
  }

  clear() {
    clearValues(this.#state);
  }

  getStats() {
    const total = this.#state.stats.hits + this.#state.stats.misses;
    return {
      size: this.#state.cache.size,
      maxSize: this.#state.maxSize,
      hits: this.#state.stats.hits,
      misses: this.#state.stats.misses,
      evictions: this.#state.stats.evictions,
      expirations: this.#state.stats.expirations,
      hitRate: total > 0 ? this.#state.stats.hits / total : 0,
    };
  }

  keys() {
    return activeKeys(this.#state);
  }

  get size() {
    return this.#state.cache.size;
  }

  cleanup() {
    return cleanupExpired(this.#state);
  }

  destroy() {
    if (this.#cleanupInterval) {
      clearInterval(this.#cleanupInterval);
      this.#cleanupInterval = null;
    }
  }

  async getOrSet(key, factory, ttl) {
    return getOrSetValue(this, key, factory, ttl);
  }
}

export default LRUCache;

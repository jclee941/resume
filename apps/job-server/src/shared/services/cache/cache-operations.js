/**
 * Basic LRU cache operations with TTL support.
 *
 * @typedef {Object} CacheEntry
 * @property {*} value
 * @property {number} expiresAt - Timestamp (0 = no expiration)
 * @property {number} lastAccessed
 * @property {number} accessCount
 */

import { evictLRU } from './eviction-policy.js';

/**
 * Get value from cache.
 * @param {Object} state
 * @param {string} key
 * @returns {*} Value or undefined
 */
export function getValue(state, key) {
  const entry = state.cache.get(key);

  if (!entry) {
    state.stats.misses++;
    return undefined;
  }

  if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
    state.cache.delete(key);
    state.stats.expirations++;
    state.stats.misses++;
    return undefined;
  }

  entry.lastAccessed = Date.now();
  entry.accessCount++;

  state.cache.delete(key);
  state.cache.set(key, entry);

  state.stats.hits++;
  return entry.value;
}

/**
 * Set value in cache.
 * @param {Object} state
 * @param {string} key
 * @param {*} value
 * @param {number} [ttl] - TTL in ms (overrides default)
 */
export function setValue(state, key, value, ttl) {
  if (state.cache.size >= state.maxSize && !state.cache.has(key)) {
    evictLRU(state);
  }

  if (state.cache.has(key)) {
    state.cache.delete(key);
  }

  const effectiveTTL = ttl !== undefined ? ttl : state.defaultTTL;
  const now = Date.now();

  state.cache.set(key, {
    value,
    expiresAt: effectiveTTL > 0 ? now + effectiveTTL : 0,
    lastAccessed: now,
    accessCount: 1,
  });
}

/**
 * Check if key exists and is not expired.
 * @param {Object} state
 * @param {string} key
 * @returns {boolean}
 */
export function hasValue(state, key) {
  const entry = state.cache.get(key);

  if (!entry) {
    return false;
  }

  if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
    state.cache.delete(key);
    state.stats.expirations++;
    return false;
  }

  return true;
}

/**
 * Delete key from cache.
 * @param {Object} state
 * @param {string} key
 * @returns {boolean} True if deleted
 */
export function deleteValue(state, key) {
  return state.cache.delete(key);
}

/**
 * Clear all entries and reset statistics.
 * @param {Object} state
 */
export function clearValues(state) {
  state.cache.clear();
  state.stats.hits = 0;
  state.stats.misses = 0;
  state.stats.evictions = 0;
  state.stats.expirations = 0;
}

/**
 * Get or compute value.
 * @param {Object} owner
 * @param {string} key
 * @param {Function} factory - Async factory function
 * @param {number} [ttl] - TTL in ms
 * @returns {Promise<*>}
 */
export async function getOrSetValue(owner, key, factory, ttl) {
  const cached = owner.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const value = await factory();
  owner.set(key, value, ttl);
  return value;
}

/**
 * Eviction and expiration policy helpers for LRU caches.
 */

/**
 * Evict least recently used entry.
 * @param {Object} state
 */
export function evictLRU(state) {
  const firstKey = state.cache.keys().next().value;
  if (firstKey !== undefined) {
    state.cache.delete(firstKey);
    state.stats.evictions++;
  }
}

/**
 * Get all non-expired keys without mutating cache contents.
 * @param {Object} state
 * @returns {string[]}
 */
export function activeKeys(state) {
  const keys = [];
  const now = Date.now();

  for (const [key, entry] of state.cache) {
    if (entry.expiresAt === 0 || now <= entry.expiresAt) {
      keys.push(key);
    }
  }

  return keys;
}

/**
 * Cleanup expired entries.
 * @param {Object} state
 * @returns {number} Number of entries removed
 */
export function cleanupExpired(state) {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of state.cache) {
    if (entry.expiresAt > 0 && now > entry.expiresAt) {
      state.cache.delete(key);
      removed++;
      state.stats.expirations++;
    }
  }

  return removed;
}

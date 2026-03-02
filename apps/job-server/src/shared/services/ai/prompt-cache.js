/**
 * Prompt caching layer using SHA-256 hashing and Cloudflare KV.
 * Deduplicates identical AI requests to reduce cost and latency.
 *
 * Cache key format: `ai-cache:{sha256(model+messages)}`
 * Stored in the SESSIONS KV namespace with a configurable TTL.
 *
 * @module ai/prompt-cache
 */

/**
 * @typedef {object} CacheStats
 * @property {number} hits - Number of cache hits
 * @property {number} misses - Number of cache misses
 * @property {number} hitRate - Hit rate as a percentage (0-100)
 */

const CACHE_PREFIX = 'ai-cache:';
const DEFAULT_TTL_SECONDS = 3600; // 1 hour

export class PromptCache {
  /**
   * @param {object} options
   * @param {object} options.kv - Cloudflare KV namespace binding (SESSIONS)
   * @param {number} [options.ttlSeconds=3600] - Cache TTL in seconds
   * @param {boolean} [options.enabled=true] - Enable/disable caching
   */
  constructor({ kv, ttlSeconds = DEFAULT_TTL_SECONDS, enabled = true }) {
    this.kv = kv;
    this.ttlSeconds = ttlSeconds;
    this.enabled = enabled;
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Generate a deterministic cache key from model + messages.
   * @param {string} model
   * @param {Array<{role: string, content: string}>} messages
   * @param {object} [params] - Additional params that affect output (temperature, etc.)
   * @returns {Promise<string>} SHA-256 hex digest prefixed with cache namespace
   */
  async getCacheKey(model, messages, params = {}) {
    const payload = JSON.stringify({
      model,
      messages,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return `${CACHE_PREFIX}${hashHex}`;
  }

  /**
   * Look up a cached response.
   * @param {string} cacheKey
   * @returns {Promise<object|null>} Cached AI response or null
   */
  async get(cacheKey) {
    if (!this.enabled || !this.kv) return null;

    try {
      const cached = await this.kv.get(cacheKey, 'json');
      if (cached) {
        this.stats.hits++;
        return { ...cached, cached: true };
      }
    } catch (err) {
      console.warn(`[PromptCache] Read error: ${err.message}`);
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store a response in cache.
   * @param {string} cacheKey
   * @param {object} response - AI response to cache
   * @returns {Promise<void>}
   */
  async set(cacheKey, response) {
    if (!this.enabled || !this.kv) return;

    try {
      const cacheEntry = {
        text: response.text,
        model: response.model,
        provider: response.provider,
        usage: response.usage,
        cachedAt: new Date().toISOString(),
      };

      await this.kv.put(cacheKey, JSON.stringify(cacheEntry), {
        expirationTtl: this.ttlSeconds,
      });
    } catch (err) {
      console.warn(`[PromptCache] Write error: ${err.message}`);
    }
  }

  /**
   * Invalidate a specific cache entry.
   * @param {string} cacheKey
   * @returns {Promise<void>}
   */
  async invalidate(cacheKey) {
    if (!this.kv) return;
    try {
      await this.kv.delete(cacheKey);
    } catch (err) {
      console.warn(`[PromptCache] Delete error: ${err.message}`);
    }
  }

  /**
   * Get cache statistics.
   * @returns {CacheStats}
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? Math.round((this.stats.hits / total) * 100) : 0,
    };
  }

  /** Reset statistics counters. */
  resetStats() {
    this.stats = { hits: 0, misses: 0 };
  }
}

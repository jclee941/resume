/**
 * Per-platform rate limiter with sliding window and token bucket algorithms.
 *
 * Provides configurable rate limiting on a per-platform basis to prevent
 * overwhelming target sites while maximizing crawl throughput.
 *
 * @module orchestrator/rate-limiter
 */

/** @typedef {{ requestsPerMinute: number, burstSize: number, cooldownMs: number }} PlatformLimit */

/**
 * Default rate limits per platform.
 * Conservative defaults to avoid detection and respect server resources.
 * @type {Record<string, PlatformLimit>}
 */
const DEFAULT_PLATFORM_LIMITS = {
  wanted: { requestsPerMinute: 20, burstSize: 3, cooldownMs: 5000 },
  jobkorea: { requestsPerMinute: 15, burstSize: 2, cooldownMs: 8000 },
  saramin: { requestsPerMinute: 15, burstSize: 2, cooldownMs: 8000 },
  linkedin: { requestsPerMinute: 10, burstSize: 2, cooldownMs: 10000 },
  remember: { requestsPerMinute: 20, burstSize: 3, cooldownMs: 5000 },
  rocketpunch: { requestsPerMinute: 15, burstSize: 2, cooldownMs: 8000 },
  programmers: { requestsPerMinute: 15, burstSize: 2, cooldownMs: 8000 },
  jumpit: { requestsPerMinute: 20, burstSize: 3, cooldownMs: 5000 },
  rallit: { requestsPerMinute: 20, burstSize: 3, cooldownMs: 5000 },
};

/** Default limit for unknown platforms */
const FALLBACK_LIMIT = { requestsPerMinute: 10, burstSize: 2, cooldownMs: 10000 };

/**
 * Token bucket state for a single platform.
 * @typedef {Object} BucketState
 * @property {number} tokens - Current available tokens
 * @property {number} maxTokens - Maximum burst size
 * @property {number} refillRate - Tokens added per millisecond
 * @property {number} lastRefill - Timestamp of last refill
 * @property {number[]} requestTimestamps - Sliding window timestamps
 * @property {number} cooldownMs - Minimum delay between requests
 * @property {number} requestsPerMinute - Max requests per 60s window
 * @property {boolean} paused - Whether this platform is paused (e.g., rate-limited)
 * @property {number|null} pausedUntil - Resume timestamp when paused
 */

export class RateLimiter {
  /** @type {Map<string, BucketState>} */
  #buckets = new Map();

  /** @type {Record<string, PlatformLimit>} */
  #platformLimits;

  /** @type {Map<string, Promise<void>>} */
  #pendingAcquires = new Map();

  /**
   * @param {Record<string, PlatformLimit>} [platformLimits] - Override default limits
   */
  constructor(platformLimits = {}) {
    this.#platformLimits = { ...DEFAULT_PLATFORM_LIMITS, ...platformLimits };
  }

  /**
   * Get or create a token bucket for a platform.
   * @param {string} platform
   * @returns {BucketState}
   */
  #getBucket(platform) {
    if (!this.#buckets.has(platform)) {
      const limit = this.#platformLimits[platform] || FALLBACK_LIMIT;
      this.#buckets.set(platform, {
        tokens: limit.burstSize,
        maxTokens: limit.burstSize,
        refillRate: limit.requestsPerMinute / 60000, // tokens per ms
        lastRefill: Date.now(),
        requestTimestamps: [],
        cooldownMs: limit.cooldownMs,
        requestsPerMinute: limit.requestsPerMinute,
        paused: false,
        pausedUntil: null,
      });
    }
    return /** @type {BucketState} */ (this.#buckets.get(platform));
  }

  /**
   * Refill tokens based on elapsed time.
   * @param {BucketState} bucket
   */
  #refillTokens(bucket) {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const newTokens = elapsed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + newTokens);
    bucket.lastRefill = now;
  }

  /**
   * Prune timestamps older than 60 seconds from sliding window.
   * @param {BucketState} bucket
   */
  #pruneWindow(bucket) {
    const cutoff = Date.now() - 60000;
    bucket.requestTimestamps = bucket.requestTimestamps.filter((ts) => ts > cutoff);
  }

  /**
   * Calculate how long to wait before a request can proceed.
   * @param {string} platform
   * @returns {number} Wait time in milliseconds (0 if immediate)
   */
  getWaitTime(platform) {
    const bucket = this.#getBucket(platform);

    // Check if platform is paused (e.g., 429 received)
    if (bucket.paused && bucket.pausedUntil) {
      const remaining = bucket.pausedUntil - Date.now();
      if (remaining > 0) return remaining;
      bucket.paused = false;
      bucket.pausedUntil = null;
    }

    this.#refillTokens(bucket);
    this.#pruneWindow(bucket);

    // Check sliding window limit
    if (bucket.requestTimestamps.length >= bucket.requestsPerMinute) {
      const oldestInWindow = bucket.requestTimestamps[0];
      return oldestInWindow + 60000 - Date.now();
    }

    // Check token bucket
    if (bucket.tokens < 1) {
      return Math.ceil((1 - bucket.tokens) / bucket.refillRate);
    }

    // Check cooldown from last request
    if (bucket.requestTimestamps.length > 0) {
      const lastRequest = bucket.requestTimestamps[bucket.requestTimestamps.length - 1];
      const cooldownRemaining = lastRequest + bucket.cooldownMs - Date.now();
      if (cooldownRemaining > 0) return cooldownRemaining;
    }

    return 0;
  }

  /**
   * Acquire permission to make a request. Resolves when the request can proceed.
   * Serializes concurrent acquires for the same platform.
   * @param {string} platform
   * @returns {Promise<void>}
   */
  async acquire(platform) {
    // Serialize acquires per platform to prevent thundering herd
    const pending = this.#pendingAcquires.get(platform);
    if (pending) {
      await pending;
    }

    const acquirePromise = this.#doAcquire(platform);
    this.#pendingAcquires.set(platform, acquirePromise);

    try {
      await acquirePromise;
    } finally {
      if (this.#pendingAcquires.get(platform) === acquirePromise) {
        this.#pendingAcquires.delete(platform);
      }
    }
  }

  /**
   * Internal acquire implementation.
   * @param {string} platform
   * @returns {Promise<void>}
   */
  async #doAcquire(platform) {
    const waitTime = this.getWaitTime(platform);
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    const bucket = this.#getBucket(platform);
    this.#refillTokens(bucket);
    bucket.tokens = Math.max(0, bucket.tokens - 1);
    bucket.requestTimestamps.push(Date.now());
  }

  /**
   * Record a request completion (success or failure).
   * On 429/rate-limit, pauses the platform for the specified duration.
   * @param {string} platform
   * @param {{ statusCode?: number, retryAfterMs?: number }} [result]
   */
  recordResponse(platform, result = {}) {
    if (result.statusCode === 429) {
      const pauseDuration = result.retryAfterMs || 60000;
      this.pause(platform, pauseDuration);
    }
  }

  /**
   * Pause a platform for a duration (e.g., after receiving 429).
   * @param {string} platform
   * @param {number} durationMs
   */
  pause(platform, durationMs) {
    const bucket = this.#getBucket(platform);
    bucket.paused = true;
    bucket.pausedUntil = Date.now() + durationMs;
    bucket.tokens = 0;
  }

  /**
   * Resume a paused platform immediately.
   * @param {string} platform
   */
  resume(platform) {
    const bucket = this.#getBucket(platform);
    bucket.paused = false;
    bucket.pausedUntil = null;
  }

  /**
   * Check if a platform is currently paused.
   * @param {string} platform
   * @returns {boolean}
   */
  isPaused(platform) {
    const bucket = this.#getBucket(platform);
    if (!bucket.paused) return false;
    if (bucket.pausedUntil && bucket.pausedUntil <= Date.now()) {
      bucket.paused = false;
      bucket.pausedUntil = null;
      return false;
    }
    return true;
  }

  /**
   * Get metrics for all tracked platforms.
   * @returns {Record<string, { requestsInWindow: number, tokensAvailable: number, paused: boolean, waitTime: number }>}
   */
  getMetrics() {
    /** @type {Record<string, { requestsInWindow: number, tokensAvailable: number, paused: boolean, waitTime: number }>} */
    const metrics = {};
    for (const [platform, bucket] of this.#buckets) {
      this.#pruneWindow(bucket);
      this.#refillTokens(bucket);
      metrics[platform] = {
        requestsInWindow: bucket.requestTimestamps.length,
        tokensAvailable: Math.floor(bucket.tokens),
        paused: this.isPaused(platform),
        waitTime: this.getWaitTime(platform),
      };
    }
    return metrics;
  }

  /**
   * Reset rate limiter state for a platform or all platforms.
   * @param {string} [platform] - If omitted, resets all
   */
  reset(platform) {
    if (platform) {
      this.#buckets.delete(platform);
      this.#pendingAcquires.delete(platform);
    } else {
      this.#buckets.clear();
      this.#pendingAcquires.clear();
    }
  }
}

export { DEFAULT_PLATFORM_LIMITS, FALLBACK_LIMIT };

/**
 * @typedef {Object} PlatformLimitConfig
 * @property {number} requestsPerMinute
 * @property {number} burstSize
 * @property {number} cooldownMs
 */

/**
 * @typedef {Object} PlatformBucket
 * @property {number} tokens
 * @property {number} maxTokens
 * @property {number} refillRate
 * @property {number} lastRefill
 * @property {number[]} requestTimestamps
 * @property {number} cooldownMs
 * @property {number} requestsPerMinute
 * @property {boolean} paused
 * @property {number | null} pausedUntil
 */

/**
 * @typedef {Object} PlatformMetric
 * @property {number} requestsInWindow
 * @property {number} tokensAvailable
 * @property {boolean} paused
 * @property {number} waitTime
 */

export const DEFAULT_PLATFORM_LIMITS = {
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

export const FALLBACK_LIMIT = { requestsPerMinute: 10, burstSize: 2, cooldownMs: 10000 };

export class RateLimiter {
  /** @type {Map<string, PlatformBucket>} */
  #buckets = new Map();
  /** @type {Map<string, Promise<void>>} */
  #pendingAcquires = new Map();

  /**
   * @param {Record<string, Partial<PlatformLimitConfig>>} [platformLimits={}]
   */
  constructor(platformLimits = {}) {
    /** @type {Record<string, PlatformLimitConfig>} */
    this.platformLimits = { ...DEFAULT_PLATFORM_LIMITS, ...platformLimits };
  }

  /**
   * @param {string} platform
   * @returns {PlatformBucket}
   */
  #getBucket(platform) {
    if (!this.#buckets.has(platform)) {
      const limit = this.platformLimits[platform] || FALLBACK_LIMIT;
      this.#buckets.set(platform, {
        tokens: limit.burstSize,
        maxTokens: limit.burstSize,
        refillRate: limit.requestsPerMinute / 60000,
        lastRefill: Date.now(),
        requestTimestamps: [],
        cooldownMs: limit.cooldownMs,
        requestsPerMinute: limit.requestsPerMinute,
        paused: false,
        pausedUntil: null,
      });
    }
    return /** @type {PlatformBucket} */ (this.#buckets.get(platform));
  }

  /**
   * @param {PlatformBucket} bucket
   */
  #refillTokens(bucket) {
    const now = Date.now();
    bucket.tokens = Math.min(
      bucket.maxTokens,
      bucket.tokens + (now - bucket.lastRefill) * bucket.refillRate
    );
    bucket.lastRefill = now;
  }

  /**
   * @param {PlatformBucket} bucket
   */
  #pruneWindow(bucket) {
    const cutoff = Date.now() - 60000;
    bucket.requestTimestamps = bucket.requestTimestamps.filter((ts) => ts > cutoff);
  }

  /**
   * @param {string} platform
   * @returns {number}
   */
  getWaitTime(platform) {
    const bucket = this.#getBucket(platform);
    if (bucket.paused && bucket.pausedUntil) {
      const remaining = bucket.pausedUntil - Date.now();
      if (remaining > 0) return remaining;
      bucket.paused = false;
      bucket.pausedUntil = null;
    }

    this.#refillTokens(bucket);
    this.#pruneWindow(bucket);
    if (bucket.requestTimestamps.length >= bucket.requestsPerMinute) {
      return bucket.requestTimestamps[0] + 60000 - Date.now();
    }
    if (bucket.tokens < 1) return Math.ceil((1 - bucket.tokens) / bucket.refillRate);
    if (bucket.requestTimestamps.length > 0) {
      const cooldownRemaining =
        /** @type {number} */ (bucket.requestTimestamps.at(-1)) + bucket.cooldownMs - Date.now();
      if (cooldownRemaining > 0) return cooldownRemaining;
    }
    return 0;
  }

  /**
   * @param {string} platform
   * @returns {Promise<void>}
   */
  async acquire(platform) {
    const pending = this.#pendingAcquires.get(platform);
    if (pending) await pending;
    const acquirePromise = this.#doAcquire(platform);
    this.#pendingAcquires.set(platform, acquirePromise);
    try {
      await acquirePromise;
    } finally {
      if (this.#pendingAcquires.get(platform) === acquirePromise)
        this.#pendingAcquires.delete(platform);
    }
  }

  /**
   * @param {string} platform
   * @returns {Promise<void>}
   */
  async #doAcquire(platform) {
    const waitTime = this.getWaitTime(platform);
    if (waitTime > 0) await new Promise((resolve) => setTimeout(resolve, waitTime));
    const bucket = this.#getBucket(platform);
    this.#refillTokens(bucket);
    bucket.tokens = Math.max(0, bucket.tokens - 1);
    bucket.requestTimestamps.push(Date.now());
  }

  /**
   * @param {string} platform
   * @param {{ statusCode?: number, retryAfterMs?: number }} [result={}]
   */
  recordResponse(platform, result = {}) {
    if (result.statusCode === 429) this.pause(platform, result.retryAfterMs || 60000);
  }

  /**
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
   * @param {string} platform
   */
  resume(platform) {
    const bucket = this.#getBucket(platform);
    bucket.paused = false;
    bucket.pausedUntil = null;
  }

  /**
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
   * @returns {Record<string, PlatformMetric>}
   */
  getMetrics() {
    /** @type {Record<string, PlatformMetric>} */
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
   * @param {string} [platform]
   */
  reset(platform) {
    if (platform) {
      this.#buckets.delete(platform);
      this.#pendingAcquires.delete(platform);
      return;
    }
    this.#buckets.clear();
    this.#pendingAcquires.clear();
  }
}

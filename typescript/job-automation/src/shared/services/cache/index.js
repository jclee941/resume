/**
 * @typedef {'hot'|'warm'|'cold'} CacheTier
 */

const HOT_TIER = 'hot';
const WARM_TIER = 'warm';
const COLD_TIER = 'cold';

const DEFAULT_OPTIONS = {
  namespace: 'cache',
  defaultTtlSeconds: 300,
  hotTtlThresholdSeconds: 300,
  warmTtlThresholdSeconds: 86400,
  tableName: 'cache_entries',
};

/**
 * @typedef {Object} CacheEnvelope
 * @property {unknown} value
 * @property {number} expiresAt
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {number} lastAccessedAt
 * @property {CacheTier} tier
 */

import {
  readHot,
  readWarm,
  readCold,
  writeHot,
  writeWarm,
  writeCold,
  deleteHot,
  deleteWarm,
  deleteCold,
} from './tier-operations.js';

/**
 * Tiered cache manager for Cloudflare KV (hot), D1 (warm), and R2 (cold).
 *
 * Strategy:
 * - hot: short TTL, low-latency KV
 * - warm: medium TTL, queryable D1
 * - cold: long TTL, durable R2 object storage
 */
export class CacheManager {
  /**
   * @param {{
   *   kv?: KVNamespace,
   *   d1?: D1Database,
   *   r2?: R2Bucket,
   *   namespace?: string,
   *   defaultTtlSeconds?: number,
   *   hotTtlThresholdSeconds?: number,
   *   warmTtlThresholdSeconds?: number,
   *   tableName?: string,
   *   logger?: Pick<Console, 'warn'|'error'|'info'>
   * }} options
   */
  constructor(options = {}) {
    this.kv = options.kv;
    this.d1 = options.d1;
    this.r2 = options.r2;
    this.logger = options.logger || console;

    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  /**
   * Fetch a value from cache with automatic promotion.
   *
   * Lookup order: KV -> D1 -> R2.
   * When a lower-tier hit occurs, the entry is promoted to a faster tier
   * according to remaining TTL.
   *
   * @template T
   * @param {string} key
   * @returns {Promise<T|null>}
   */
  async get(key) {
    const now = Date.now();
    const tieredKey = this.makeTieredKey(key);

    const hot = await readHot(this.kv, tieredKey, now, this.logger);
    if (hot) {
      return /** @type {T} */ (hot.value);
    }

    const warm = await readWarm(this.d1, tieredKey, now, this.options.tableName, this.logger);
    if (warm) {
      await this.promoteFrom(WARM_TIER, key, warm, now);
      return /** @type {T} */ (warm.value);
    }

    const objectKey = this.makeR2ObjectKey(key);
    const cold = await readCold(this.r2, objectKey, now, this.logger);
    if (cold) {
      await this.promoteFrom(COLD_TIER, key, cold, now);
      return /** @type {T} */ (cold.value);
    }

    return null;
  }

  /**
   * Set a value in the best tier based on TTL.
   *
   * @param {string} key
   * @param {unknown} value
   * @param {{ ttlSeconds?: number }} [options]
   * @returns {Promise<{ tier: CacheTier, expiresAt: number }>}
   */
  async set(key, value, options = {}) {
    const ttlSeconds = Math.max(
      1,
      Math.floor(options.ttlSeconds ?? this.options.defaultTtlSeconds)
    );
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;
    const tier = this.selectTier(ttlSeconds);

    const envelope = this.createEnvelope(value, tier, now, expiresAt);
    const tieredKey = this.makeTieredKey(key);
    const objectKey = this.makeR2ObjectKey(key);

    if (tier === HOT_TIER) {
      await writeHot(this.kv, tieredKey, envelope, ttlSeconds, this.logger);
      await deleteWarm(this.d1, tieredKey, this.options.tableName, this.logger);
      await deleteCold(this.r2, objectKey, this.logger);
    } else if (tier === WARM_TIER) {
      await writeWarm(this.d1, tieredKey, envelope, this.options.tableName, this.logger);
      await deleteHot(this.kv, tieredKey, this.logger);
      await deleteCold(this.r2, objectKey, this.logger);
    } else {
      await writeCold(this.r2, objectKey, envelope, this.logger);
      await deleteHot(this.kv, tieredKey, this.logger);
      await deleteWarm(this.d1, tieredKey, this.options.tableName, this.logger);
    }

    return { tier, expiresAt };
  }

  /**
   * Remove a key from all tiers.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(key) {
    const tieredKey = this.makeTieredKey(key);
    const objectKey = this.makeR2ObjectKey(key);
    await Promise.allSettled([
      deleteHot(this.kv, tieredKey, this.logger),
      deleteWarm(this.d1, tieredKey, this.options.tableName, this.logger),
      deleteCold(this.r2, objectKey, this.logger),
    ]);
  }

  /**
   * @private
   * @param {number} ttlSeconds
   * @returns {CacheTier}
   */
  selectTier(ttlSeconds) {
    if (ttlSeconds <= this.options.hotTtlThresholdSeconds) {
      return HOT_TIER;
    }

    if (ttlSeconds <= this.options.warmTtlThresholdSeconds) {
      return WARM_TIER;
    }

    return COLD_TIER;
  }

  /**
   * @private
   * @param {unknown} value
   * @param {CacheTier} tier
   * @param {number} now
   * @param {number} expiresAt
   * @returns {CacheEnvelope}
   */
  createEnvelope(value, tier, now, expiresAt) {
    return {
      value,
      tier,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      expiresAt,
    };
  }

  /**
   * @private
   * @param {CacheTier} sourceTier
   * @param {string} key
   * @param {CacheEnvelope} envelope
   * @param {number} now
   */
  async promoteFrom(sourceTier, key, envelope, now) {
    const ttlSeconds = Math.max(1, Math.floor((envelope.expiresAt - now) / 1000));
    const nextTier = this.selectTier(ttlSeconds);

    const promoted = {
      ...envelope,
      tier: nextTier,
      updatedAt: now,
      lastAccessedAt: now,
    };

    const tieredKey = this.makeTieredKey(key);
    const objectKey = this.makeR2ObjectKey(key);

    if (nextTier === HOT_TIER) {
      await writeHot(this.kv, tieredKey, promoted, ttlSeconds, this.logger);
      if (sourceTier === COLD_TIER) {
        await deleteCold(this.r2, objectKey, this.logger);
      }
      return;
    }

    if (nextTier === WARM_TIER) {
      await writeWarm(this.d1, tieredKey, promoted, this.options.tableName, this.logger);
      if (sourceTier === COLD_TIER) {
        await deleteCold(this.r2, objectKey, this.logger);
      }
      return;
    }

    await writeCold(this.r2, objectKey, promoted, this.logger);
  }

  /**
   * @private
   * @param {string} key
   */
  makeTieredKey(key) {
    return `${this.options.namespace}:${key}`;
  }

  /**
   * @private
   * @param {string} key
   */
  makeR2ObjectKey(key) {
    return `${this.options.namespace}/${encodeURIComponent(key)}.json`;
  }
}

export default CacheManager;

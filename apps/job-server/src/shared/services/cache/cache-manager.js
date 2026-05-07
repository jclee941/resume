/** @typedef {'hot'|'warm'|'cold'} CacheTier */

import {
  deleteCold,
  deleteHot,
  deleteWarm,
  readCold,
  readHot,
  readWarm,
  writeCold,
  writeHot,
  writeWarm,
} from './tier-operations.js';

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

/** Tiered cache manager for Cloudflare KV (hot), D1 (warm), and R2 (cold). */
export class CacheManager {
  constructor(options = {}) {
    this.kv = options.kv;
    this.d1 = options.d1;
    this.r2 = options.r2;
    this.logger = options.logger || console;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async get(key) {
    const now = Date.now();
    const tieredKey = this.makeTieredKey(key);
    const hot = await readHot(this.kv, tieredKey, now, this.logger);
    if (hot) return hot.value;

    const warm = await readWarm(this.d1, tieredKey, now, this.options.tableName, this.logger);
    if (warm) {
      await this.promoteFrom(WARM_TIER, key, warm, now);
      return warm.value;
    }

    const cold = await readCold(this.r2, this.makeR2ObjectKey(key), now, this.logger);
    if (cold) {
      await this.promoteFrom(COLD_TIER, key, cold, now);
      return cold.value;
    }

    return null;
  }

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

  async delete(key) {
    const tieredKey = this.makeTieredKey(key);
    const objectKey = this.makeR2ObjectKey(key);
    await Promise.allSettled([
      deleteHot(this.kv, tieredKey, this.logger),
      deleteWarm(this.d1, tieredKey, this.options.tableName, this.logger),
      deleteCold(this.r2, objectKey, this.logger),
    ]);
  }

  selectTier(ttlSeconds) {
    if (ttlSeconds <= this.options.hotTtlThresholdSeconds) return HOT_TIER;
    if (ttlSeconds <= this.options.warmTtlThresholdSeconds) return WARM_TIER;
    return COLD_TIER;
  }

  createEnvelope(value, tier, now, expiresAt) {
    return { value, tier, createdAt: now, updatedAt: now, lastAccessedAt: now, expiresAt };
  }

  async promoteFrom(sourceTier, key, envelope, now) {
    const ttlSeconds = Math.max(1, Math.floor((envelope.expiresAt - now) / 1000));
    const nextTier = this.selectTier(ttlSeconds);
    const promoted = { ...envelope, tier: nextTier, updatedAt: now, lastAccessedAt: now };
    const tieredKey = this.makeTieredKey(key);
    const objectKey = this.makeR2ObjectKey(key);

    if (nextTier === HOT_TIER) {
      await writeHot(this.kv, tieredKey, promoted, ttlSeconds, this.logger);
    } else if (nextTier === WARM_TIER) {
      await writeWarm(this.d1, tieredKey, promoted, this.options.tableName, this.logger);
    } else {
      await writeCold(this.r2, objectKey, promoted, this.logger);
    }

    if (sourceTier === COLD_TIER && (nextTier === HOT_TIER || nextTier === WARM_TIER)) {
      await deleteCold(this.r2, objectKey, this.logger);
    }
  }

  makeTieredKey(key) {
    return `${this.options.namespace}:${key}`;
  }

  makeR2ObjectKey(key) {
    return `${this.options.namespace}/${encodeURIComponent(key)}.json`;
  }
}

export default CacheManager;

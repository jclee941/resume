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

/**
 * @typedef {{
 *   get(key: string, type?: string): Promise<unknown>;
 *   put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void | unknown>;
 *   delete(key: string): Promise<unknown>;
 * }} CacheKvBinding
 *
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       first(): Promise<Record<string, unknown> | null>;
 *       run(): Promise<unknown>;
 *     };
 *     run(): Promise<unknown>;
 *   };
 * }} CacheD1Binding
 *
 * @typedef {{
 *   get(key: string): Promise<{ json(): Promise<unknown> } | null>;
 *   put(key: string, value: string, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
 *   delete(key: string): Promise<unknown>;
 * }} CacheR2Binding
 *
 * @typedef {{
 *   kv?: CacheKvBinding | null;
 *   d1?: CacheD1Binding | null;
 *   r2?: CacheR2Binding | null;
 *   logger?: Pick<Console, 'warn'|'error'|'info'>;
 *   namespace?: string;
 *   defaultTtlSeconds?: number;
 *   hotTtlThresholdSeconds?: number;
 *   warmTtlThresholdSeconds?: number;
 *   tableName?: string;
 * }} CacheManagerOptions
 */

/** Tiered cache manager for Cloudflare KV (hot), D1 (warm), and R2 (cold). */
export class CacheManager {
  /**
   * @param {CacheManagerOptions} [options]
   */
  constructor(options = {}) {
    /** @type {CacheKvBinding} */
    this.kv = /** @type {CacheKvBinding} */ (options.kv);
    /** @type {CacheD1Binding} */
    this.d1 = /** @type {CacheD1Binding} */ (options.d1);
    /** @type {CacheR2Binding} */
    this.r2 = /** @type {CacheR2Binding} */ (options.r2);
    /** @type {Pick<Console, 'warn'|'error'|'info'>} */
    this.logger = options.logger || console;
    /** @type {typeof DEFAULT_OPTIONS} */
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * @param {string} key
   * @returns {Promise<unknown>}
   */
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

  /**
   * @param {string} key
   * @param {unknown} value
   * @param {{ ttlSeconds?: number }} [options]
   * @returns {Promise<{ tier: CacheTier; expiresAt: number }>}
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
   * @param {number} ttlSeconds
   * @returns {CacheTier}
   */
  selectTier(ttlSeconds) {
    if (ttlSeconds <= this.options.hotTtlThresholdSeconds) return HOT_TIER;
    if (ttlSeconds <= this.options.warmTtlThresholdSeconds) return WARM_TIER;
    return COLD_TIER;
  }

  /**
   * @param {unknown} value
   * @param {CacheTier} tier
   * @param {number} now
   * @param {number} expiresAt
   * @returns {CacheEnvelope}
   */
  createEnvelope(value, tier, now, expiresAt) {
    return { value, tier, createdAt: now, updatedAt: now, lastAccessedAt: now, expiresAt };
  }

  /**
   * @param {CacheTier} sourceTier
   * @param {string} key
   * @param {CacheEnvelope} envelope
   * @param {number} now
   * @returns {Promise<void>}
   */
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

  /**
   * @param {string} key
   * @returns {string}
   */
  makeTieredKey(key) {
    return `${this.options.namespace}:${key}`;
  }

  /**
   * @param {string} key
   * @returns {string}
   */
  makeR2ObjectKey(key) {
    return `${this.options.namespace}/${encodeURIComponent(key)}.json`;
  }
}

export default CacheManager;

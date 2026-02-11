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

    this.schemaReady = false;
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

    const hot = await this.readHot(key, now);
    if (hot) {
      return /** @type {T} */ (hot.value);
    }

    const warm = await this.readWarm(key, now);
    if (warm) {
      await this.promoteFrom(WARM_TIER, key, warm, now);
      return /** @type {T} */ (warm.value);
    }

    const cold = await this.readCold(key, now);
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

    if (tier === HOT_TIER) {
      await this.writeHot(key, envelope, ttlSeconds);
      await this.deleteWarm(key);
      await this.deleteCold(key);
    } else if (tier === WARM_TIER) {
      await this.writeWarm(key, envelope);
      await this.deleteHot(key);
      await this.deleteCold(key);
    } else {
      await this.writeCold(key, envelope);
      await this.deleteHot(key);
      await this.deleteWarm(key);
    }

    return { tier, expiresAt };
  }

  /**
   * Remove a key from all tiers.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(key) {
    await Promise.allSettled([this.deleteHot(key), this.deleteWarm(key), this.deleteCold(key)]);
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

    if (nextTier === HOT_TIER) {
      await this.writeHot(key, promoted, ttlSeconds);
      if (sourceTier === COLD_TIER) {
        await this.deleteCold(key);
      }
      return;
    }

    if (nextTier === WARM_TIER) {
      await this.writeWarm(key, promoted);
      if (sourceTier === COLD_TIER) {
        await this.deleteCold(key);
      }
      return;
    }

    await this.writeCold(key, promoted);
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

  /**
   * @private
   * @param {string} key
   * @param {number} now
   * @returns {Promise<CacheEnvelope|null>}
   */
  async readHot(key, now) {
    if (!this.kv) {
      return null;
    }

    try {
      const raw = await this.kv.get(this.makeTieredKey(key), 'json');
      if (!raw || typeof raw !== 'object') {
        return null;
      }

      const envelope = /** @type {CacheEnvelope} */ (raw);
      if (envelope.expiresAt <= now) {
        await this.deleteHot(key);
        return null;
      }

      return envelope;
    } catch (error) {
      this.logger.warn?.(`[CacheManager] hot read failed for ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * @private
   * @param {string} key
   * @param {number} now
   * @returns {Promise<CacheEnvelope|null>}
   */
  async readWarm(key, now) {
    if (!this.d1) {
      return null;
    }

    try {
      await this.ensureD1Schema();
      const row = await this.d1
        .prepare(
          `SELECT value, expires_at, created_at, updated_at, last_accessed_at
           FROM ${this.options.tableName}
           WHERE cache_key = ?1`
        )
        .bind(this.makeTieredKey(key))
        .first();

      if (!row) {
        return null;
      }

      const expiresAt = Number(row.expires_at);
      if (expiresAt <= now) {
        await this.deleteWarm(key);
        return null;
      }

      const envelope = {
        value: JSON.parse(String(row.value)),
        tier: WARM_TIER,
        expiresAt,
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
        lastAccessedAt: Number(row.last_accessed_at),
      };

      await this.d1
        .prepare(`UPDATE ${this.options.tableName} SET last_accessed_at = ?1 WHERE cache_key = ?2`)
        .bind(now, this.makeTieredKey(key))
        .run();

      return envelope;
    } catch (error) {
      this.logger.warn?.(`[CacheManager] warm read failed for ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * @private
   * @param {string} key
   * @param {number} now
   * @returns {Promise<CacheEnvelope|null>}
   */
  async readCold(key, now) {
    if (!this.r2) {
      return null;
    }

    try {
      const object = await this.r2.get(this.makeR2ObjectKey(key));
      if (!object) {
        return null;
      }

      const payload = await object.json();
      const envelope = /** @type {CacheEnvelope} */ (payload);

      if (envelope.expiresAt <= now) {
        await this.deleteCold(key);
        return null;
      }

      return {
        ...envelope,
        tier: COLD_TIER,
      };
    } catch (error) {
      this.logger.warn?.(`[CacheManager] cold read failed for ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * @private
   * @param {string} key
   * @param {CacheEnvelope} envelope
   * @param {number} ttlSeconds
   */
  async writeHot(key, envelope, ttlSeconds) {
    if (!this.kv) {
      return;
    }

    try {
      await this.kv.put(this.makeTieredKey(key), JSON.stringify(envelope), {
        expirationTtl: ttlSeconds,
      });
    } catch (error) {
      this.logger.warn?.(`[CacheManager] hot write failed for ${key}: ${error.message}`);
    }
  }

  /**
   * @private
   * @param {string} key
   * @param {CacheEnvelope} envelope
   */
  async writeWarm(key, envelope) {
    if (!this.d1) {
      return;
    }

    try {
      await this.ensureD1Schema();
      await this.d1
        .prepare(
          `INSERT INTO ${this.options.tableName}
             (cache_key, value, expires_at, created_at, updated_at, last_accessed_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)
           ON CONFLICT(cache_key) DO UPDATE SET
             value = excluded.value,
             expires_at = excluded.expires_at,
             updated_at = excluded.updated_at,
             last_accessed_at = excluded.last_accessed_at`
        )
        .bind(
          this.makeTieredKey(key),
          JSON.stringify(envelope.value),
          envelope.expiresAt,
          envelope.createdAt,
          envelope.updatedAt,
          envelope.lastAccessedAt
        )
        .run();
    } catch (error) {
      this.logger.warn?.(`[CacheManager] warm write failed for ${key}: ${error.message}`);
    }
  }

  /**
   * @private
   * @param {string} key
   * @param {CacheEnvelope} envelope
   */
  async writeCold(key, envelope) {
    if (!this.r2) {
      return;
    }

    try {
      await this.r2.put(this.makeR2ObjectKey(key), JSON.stringify(envelope), {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          expiresAt: String(envelope.expiresAt),
          namespace: this.options.namespace,
        },
      });
    } catch (error) {
      this.logger.warn?.(`[CacheManager] cold write failed for ${key}: ${error.message}`);
    }
  }

  /**
   * @private
   * @param {string} key
   */
  async deleteHot(key) {
    if (!this.kv) {
      return;
    }

    try {
      await this.kv.delete(this.makeTieredKey(key));
    } catch (error) {
      this.logger.warn?.(`[CacheManager] hot delete failed for ${key}: ${error.message}`);
    }
  }

  /**
   * @private
   * @param {string} key
   */
  async deleteWarm(key) {
    if (!this.d1) {
      return;
    }

    try {
      await this.ensureD1Schema();
      await this.d1
        .prepare(`DELETE FROM ${this.options.tableName} WHERE cache_key = ?1`)
        .bind(this.makeTieredKey(key))
        .run();
    } catch (error) {
      this.logger.warn?.(`[CacheManager] warm delete failed for ${key}: ${error.message}`);
    }
  }

  /**
   * @private
   * @param {string} key
   */
  async deleteCold(key) {
    if (!this.r2) {
      return;
    }

    try {
      await this.r2.delete(this.makeR2ObjectKey(key));
    } catch (error) {
      this.logger.warn?.(`[CacheManager] cold delete failed for ${key}: ${error.message}`);
    }
  }

  /**
   * @private
   * @returns {Promise<void>}
   */
  async ensureD1Schema() {
    if (this.schemaReady || !this.d1) {
      return;
    }

    await this.d1
      .prepare(
        `CREATE TABLE IF NOT EXISTS ${this.options.tableName} (
          cache_key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          last_accessed_at INTEGER NOT NULL
        )`
      )
      .run();

    await this.d1
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_${this.options.tableName}_expires_at
         ON ${this.options.tableName}(expires_at)`
      )
      .run();

    this.schemaReady = true;
  }
}

export default CacheManager;

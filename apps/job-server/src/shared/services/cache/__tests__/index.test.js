import assert from 'node:assert/strict';
import { describe, it, beforeEach, mock } from 'node:test';

import { CacheManager } from '../index.js';
import CacheManagerDefault from '../index.js';

function createKv() {
  const store = new Map();
  return {
    store,
    get: mock.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    put: mock.fn(async (key, value) => {
      store.set(key, JSON.parse(String(value)));
    }),
    delete: mock.fn(async (key) => {
      store.delete(key);
    }),
  };
}

function createR2() {
  const store = new Map();
  return {
    store,
    get: mock.fn(async (key) => {
      if (!store.has(key)) return null;
      const payload = store.get(key);
      return { json: async () => payload };
    }),
    put: mock.fn(async (key, value) => {
      store.set(key, JSON.parse(String(value)));
    }),
    delete: mock.fn(async (key) => {
      store.delete(key);
    }),
  };
}

function createD1() {
  const rows = new Map();
  const d1 = {
    prepare: mock.fn((sql) => {
      if (/CREATE TABLE IF NOT EXISTS/.test(sql) || /CREATE INDEX IF NOT EXISTS/.test(sql)) {
        return {
          run: mock.fn(async () => ({ success: true })),
        };
      }

      if (/SELECT value, expires_at/.test(sql)) {
        return {
          bind: mock.fn((key) => ({
            first: mock.fn(async () => {
              const row = rows.get(key);
              if (!row) return null;
              return {
                value: JSON.stringify(row.value),
                expires_at: row.expiresAt,
                created_at: row.createdAt,
                updated_at: row.updatedAt,
                last_accessed_at: row.lastAccessedAt,
              };
            }),
          })),
        };
      }

      if (/UPDATE cache_entries SET last_accessed_at/.test(sql)) {
        return {
          bind: mock.fn((lastAccessedAt, key) => ({
            run: mock.fn(async () => {
              const row = rows.get(key);
              if (row) {
                row.lastAccessedAt = lastAccessedAt;
              }
              return { success: true };
            }),
          })),
        };
      }

      if (/INSERT INTO cache_entries/.test(sql)) {
        return {
          bind: mock.fn((key, value, expiresAt, createdAt, updatedAt, lastAccessedAt) => ({
            run: mock.fn(async () => {
              rows.set(key, {
                value: JSON.parse(String(value)),
                expiresAt,
                createdAt,
                updatedAt,
                lastAccessedAt,
              });
              return { success: true };
            }),
          })),
        };
      }

      if (/DELETE FROM cache_entries/.test(sql)) {
        return {
          bind: mock.fn((key) => ({
            run: mock.fn(async () => {
              rows.delete(key);
              return { success: true };
            }),
          })),
        };
      }

      return {
        bind: mock.fn(() => ({
          first: mock.fn(async () => null),
          run: mock.fn(async () => ({ success: true })),
        })),
        run: mock.fn(async () => ({ success: true })),
      };
    }),
  };

  return { d1, rows };
}

describe('CacheManager', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('exports default class and constructor defaults', () => {
    const manager = new CacheManager();
    assert.equal(CacheManagerDefault, CacheManager);
    assert.equal(manager.options.namespace, 'cache');
    assert.equal(manager.options.defaultTtlSeconds, 300);
    assert.equal(manager.options.hotTtlThresholdSeconds, 300);
    assert.equal(manager.options.warmTtlThresholdSeconds, 86400);
    assert.equal(manager.options.tableName, 'cache_entries');
    assert.equal(manager.logger, console);
  });

  it('returns hot tier value without warm or cold fallback', async () => {
    const kv = createKv();
    const manager = new CacheManager({ kv, namespace: 'n' });
    kv.store.set('n:key', {
      value: { source: 'hot' },
      expiresAt: Date.now() + 10000,
      createdAt: 1,
      updatedAt: 1,
      lastAccessedAt: 1,
      tier: 'hot',
    });

    const value = await manager.get('key');

    assert.deepEqual(value, { source: 'hot' });
    assert.equal(kv.get.mock.callCount(), 1);
  });

  it('falls back to warm and promotes to hot', async () => {
    const kv = createKv();
    const { d1, rows } = createD1();
    const manager = new CacheManager({ kv, d1, namespace: 'n' });
    const now = Date.now();
    rows.set('n:key', {
      value: { source: 'warm' },
      expiresAt: now + 120 * 1000,
      createdAt: now - 1000,
      updatedAt: now - 500,
      lastAccessedAt: now - 200,
    });

    const value = await manager.get('key');

    assert.deepEqual(value, { source: 'warm' });
    assert.equal(kv.store.has('n:key'), true);
  });

  it('falls back to cold and promotes to warm', async () => {
    const kv = createKv();
    const { d1, rows } = createD1();
    const r2 = createR2();
    const manager = new CacheManager({ kv, d1, r2, namespace: 'n' });
    const now = Date.now();
    r2.store.set('n/key.json', {
      value: { source: 'cold' },
      expiresAt: now + 400 * 1000,
      createdAt: now - 1000,
      updatedAt: now - 500,
      lastAccessedAt: now - 100,
      tier: 'cold',
    });

    const value = await manager.get('key');

    assert.deepEqual(value, { source: 'cold' });
    assert.equal(rows.has('n:key'), true);
    assert.equal(r2.store.has('n/key.json'), false);
  });

  it('returns null when key is absent in all tiers', async () => {
    const kv = createKv();
    const { d1 } = createD1();
    const r2 = createR2();
    const manager = new CacheManager({ kv, d1, r2, namespace: 'n' });

    assert.equal(await manager.get('missing'), null);
  });

  it('sets hot, warm, and cold tiers and evicts other tiers', async () => {
    const kv = createKv();
    const { d1, rows } = createD1();
    const r2 = createR2();
    const manager = new CacheManager({ kv, d1, r2, namespace: 'n' });

    const hot = await manager.set('hot', { v: 1 }, { ttlSeconds: 10 });
    assert.equal(hot.tier, 'hot');
    assert.equal(kv.store.has('n:hot'), true);
    assert.equal(rows.has('n:hot'), false);
    assert.equal(r2.store.has('n/hot.json'), false);

    const warm = await manager.set('warm', { v: 2 }, { ttlSeconds: 600 });
    assert.equal(warm.tier, 'warm');
    assert.equal(rows.has('n:warm'), true);
    assert.equal(kv.store.has('n:warm'), false);
    assert.equal(r2.store.has('n/warm.json'), false);

    const cold = await manager.set('cold', { v: 3 }, { ttlSeconds: 100000 });
    assert.equal(cold.tier, 'cold');
    assert.equal(r2.store.has('n/cold.json'), true);
    assert.equal(kv.store.has('n:cold'), false);
    assert.equal(rows.has('n:cold'), false);

    const floored = await manager.set('floored', { v: 4 }, { ttlSeconds: 0 });
    assert.equal(floored.tier, 'hot');
  });

  it('uses default ttl when ttlSeconds option is omitted', async () => {
    const kv = createKv();
    const manager = new CacheManager({ kv, namespace: 'n', defaultTtlSeconds: 123 });

    const start = Date.now();
    const result = await manager.set('default-ttl', { v: 9 });
    const end = Date.now();

    assert.equal(result.tier, 'hot');
    assert.ok(result.expiresAt >= start + 123000);
    assert.ok(result.expiresAt <= end + 123000);
    assert.equal(kv.store.has('n:default-ttl'), true);
  });

  it('deletes key from all tiers even when one deletion fails', async () => {
    const kv = createKv();
    const { d1, rows } = createD1();
    const r2 = createR2();
    const manager = new CacheManager({ kv, d1, r2, namespace: 'n' });

    kv.store.set('n:key', { value: 1, expiresAt: Date.now() + 1000 });
    rows.set('n:key', {
      value: 1,
      expiresAt: Date.now() + 1000,
      createdAt: 1,
      updatedAt: 1,
      lastAccessedAt: 1,
    });
    r2.store.set('n/key.json', { value: 1, expiresAt: Date.now() + 1000 });

    kv.delete.mock.mockImplementation(async () => {
      throw new Error('kv-delete-fail');
    });

    await manager.delete('key');

    assert.equal(rows.has('n:key'), false);
    assert.equal(r2.store.has('n/key.json'), false);
  });

  it('selectTier, createEnvelope, and key helpers return expected values', () => {
    const manager = new CacheManager({ namespace: 'my-cache' });

    assert.equal(manager.selectTier(300), 'hot');
    assert.equal(manager.selectTier(301), 'warm');
    assert.equal(manager.selectTier(86400), 'warm');
    assert.equal(manager.selectTier(86401), 'cold');

    assert.deepEqual(manager.createEnvelope({ x: 1 }, 'warm', 10, 20), {
      value: { x: 1 },
      tier: 'warm',
      createdAt: 10,
      updatedAt: 10,
      lastAccessedAt: 10,
      expiresAt: 20,
    });
    assert.equal(manager.makeTieredKey('a:b'), 'my-cache:a:b');
    assert.equal(manager.makeR2ObjectKey('a b/c'), 'my-cache/a%20b%2Fc.json');
  });

  it('promotes from cold to hot, warm, and cold paths', async () => {
    const kv = createKv();
    const { d1, rows } = createD1();
    const r2 = createR2();
    const manager = new CacheManager({ kv, d1, r2, namespace: 'n' });
    const now = Date.now();

    await manager.promoteFrom(
      'cold',
      'k-hot',
      {
        value: 1,
        tier: 'cold',
        createdAt: now - 100,
        updatedAt: now - 50,
        lastAccessedAt: now - 10,
        expiresAt: now + 100 * 1000,
      },
      now
    );
    assert.equal(kv.store.has('n:k-hot'), true);

    await manager.promoteFrom(
      'cold',
      'k-warm',
      {
        value: 2,
        tier: 'cold',
        createdAt: now - 100,
        updatedAt: now - 50,
        lastAccessedAt: now - 10,
        expiresAt: now + 400 * 1000,
      },
      now
    );
    assert.equal(rows.has('n:k-warm'), true);

    await manager.promoteFrom(
      'warm',
      'k-cold',
      {
        value: 3,
        tier: 'warm',
        createdAt: now - 100,
        updatedAt: now - 50,
        lastAccessedAt: now - 10,
        expiresAt: now + 200000 * 1000,
      },
      now
    );
    assert.equal(r2.store.has('n/k-cold.json'), true);
  });
});

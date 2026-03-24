import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { PromptCache } from '../prompt-cache.js';

beforeEach(() => {
  mock.restoreAll();
});

describe('PromptCache', () => {
  it('returns deterministic cache key for identical inputs', async () => {
    const digest = mock.method(globalThis.crypto.subtle, 'digest', async () => {
      return new Uint8Array([0, 1, 255]).buffer;
    });
    const cache = new PromptCache({ kv: { get: async () => null, put: async () => undefined } });

    const keyA = await cache.getCacheKey('gpt-4o-mini', [{ role: 'user', content: 'hello' }], {
      temperature: 0.2,
      max_tokens: 123,
    });
    const keyB = await cache.getCacheKey('gpt-4o-mini', [{ role: 'user', content: 'hello' }], {
      temperature: 0.2,
      max_tokens: 123,
    });

    assert.equal(keyA, 'ai-cache:0001ff');
    assert.equal(keyB, 'ai-cache:0001ff');
    assert.equal(digest.mock.callCount(), 2);
  });

  it('returns null when disabled or kv is missing', async () => {
    const kv = {
      get: mock.fn(async () => ({ text: 'cached' })),
      put: mock.fn(async () => undefined),
      delete: mock.fn(async () => undefined),
    };

    const disabledCache = new PromptCache({ kv, enabled: false });
    const noKvCache = new PromptCache({ kv: null });

    assert.equal(await disabledCache.get('k1'), null);
    await disabledCache.set('k1', { text: 'x' });
    assert.equal(kv.get.mock.callCount(), 0);
    assert.equal(kv.put.mock.callCount(), 0);

    assert.equal(await noKvCache.get('k2'), null);
    await noKvCache.set('k2', { text: 'y' });
  });

  it('handles cache hit, cache miss, and read errors with stats', async () => {
    const logger = { warn: mock.fn() };
    const kv = {
      get: mock.fn(async (key) => {
        if (key === 'hit') {
          return { text: 'hello', model: 'm', provider: 'p', usage: { total_tokens: 3 } };
        }
        if (key === 'boom') {
          throw new Error('read-failed');
        }
        return null;
      }),
      put: mock.fn(async () => undefined),
      delete: mock.fn(async () => undefined),
    };
    const cache = new PromptCache({ kv, logger });

    const hit = await cache.get('hit');
    const miss = await cache.get('miss');
    const errored = await cache.get('boom');

    assert.equal(hit.cached, true);
    assert.equal(hit.text, 'hello');
    assert.equal(miss, null);
    assert.equal(errored, null);

    const stats = cache.getStats();
    assert.equal(stats.hits, 1);
    assert.equal(stats.misses, 2);
    assert.equal(stats.hitRate, 33);
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.match(logger.warn.mock.calls[0].arguments[0], /Read error: read-failed/);
  });

  it('writes cache entries with ttl and handles write errors', async () => {
    const logger = { warn: mock.fn() };
    const kv = {
      get: mock.fn(async () => null),
      put: mock.fn(async (key) => {
        if (key === 'boom') {
          throw new Error('write-failed');
        }
      }),
      delete: mock.fn(async () => undefined),
    };
    const cache = new PromptCache({ kv, ttlSeconds: 222, logger });

    await cache.set('ok', {
      text: 'cached text',
      model: 'gpt-4o-mini',
      provider: 'openai',
      usage: { total_tokens: 10 },
    });
    await cache.set('boom', {
      text: 'cached text',
      model: 'gpt-4o-mini',
      provider: 'openai',
      usage: { total_tokens: 10 },
    });

    assert.equal(kv.put.mock.callCount(), 2);
    assert.equal(kv.put.mock.calls[0].arguments[2].expirationTtl, 222);
    const parsed = JSON.parse(kv.put.mock.calls[0].arguments[1]);
    assert.equal(parsed.text, 'cached text');
    assert.equal(parsed.model, 'gpt-4o-mini');
    assert.equal(parsed.provider, 'openai');
    assert.ok(typeof parsed.cachedAt === 'string');
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.match(logger.warn.mock.calls[0].arguments[0], /Write error: write-failed/);
  });

  it('invalidates entries, handles delete errors, and resets stats', async () => {
    const logger = { warn: mock.fn() };
    const kv = {
      get: mock.fn(async () => null),
      put: mock.fn(async () => undefined),
      delete: mock.fn(async (key) => {
        if (key === 'boom') {
          throw new Error('delete-failed');
        }
      }),
    };
    const cache = new PromptCache({ kv, logger });

    await cache.get('miss-a');
    await cache.get('miss-b');
    await cache.invalidate('ok');
    await cache.invalidate('boom');

    assert.equal(kv.delete.mock.callCount(), 2);
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.match(logger.warn.mock.calls[0].arguments[0], /Delete error: delete-failed/);

    cache.resetStats();
    assert.deepEqual(cache.getStats(), { hits: 0, misses: 0, hitRate: 0 });

    const noKvCache = new PromptCache({ kv: null });
    await noKvCache.invalidate('none');
  });
});

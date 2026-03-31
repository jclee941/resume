import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenBucketRateLimiter } from '../token-bucket.js';

class MemoryKvWithCas {
  constructor() {
    this.store = new Map();
    this.putCalls = [];
  }

  _isExpired(entry) {
    return entry?.expiresAt && entry.expiresAt <= Date.now();
  }

  _getEntry(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this._isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async get(key, options = {}) {
    const entry = this._getEntry(key);
    if (!entry) return null;
    if (options.type === 'json') {
      return JSON.parse(entry.value);
    }
    return entry.value;
  }

  async getWithMetadata(key, options = {}) {
    const entry = this._getEntry(key);
    if (!entry) return { value: null, metadata: null };

    const value = options.type === 'json' ? JSON.parse(entry.value) : entry.value;
    return {
      value,
      metadata: { version: entry.version },
    };
  }

  async put(key, value, options = {}) {
    const current = this._getEntry(key);
    const nextVersion = (current?.version || 0) + 1;
    const expiresAt = options.expirationTtl ? Date.now() + options.expirationTtl * 1000 : null;
    this.putCalls.push({ key, options });

    this.store.set(key, {
      value,
      version: nextVersion,
      expiresAt,
    });
  }

  async cas(key, value, options = {}) {
    const current = this._getEntry(key);
    const expectedVersion = options.expectedVersion ?? null;
    const currentVersion = current?.version ?? null;

    if (currentVersion !== expectedVersion) {
      return false;
    }

    await this.put(key, value, options);
    return true;
  }
}

function withFakeNow(now, fn) {
  const realNow = Date.now;
  Date.now = () => now;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      Date.now = realNow;
    });
}

test('checkLimit allows when bucket has tokens and returns remaining count', async () => {
  const env = { SESSIONS: new MemoryKvWithCas() };
  const limiter = new TokenBucketRateLimiter(env);

  const result = await limiter.checkLimit('chat-1');

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 19);
  assert.ok(Number.isInteger(result.resetTime));
});

test('consume decrements tokens and denies when capacity exhausted', async () => {
  const env = { SESSIONS: new MemoryKvWithCas() };
  const limiter = new TokenBucketRateLimiter(env, { capacity: 2, refillRate: 0 });

  const first = await limiter.consume('chat-2');
  const second = await limiter.consume('chat-2');
  const third = await limiter.consume('chat-2');

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
});

test('refill math restores tokens at minute boundary', async () => {
  const env = { SESSIONS: new MemoryKvWithCas() };
  const limiter = new TokenBucketRateLimiter(env, { capacity: 20, refillRate: 20 / 60 });
  const key = 'rate_limit:telegram:chat-3';

  await env.SESSIONS.put(
    key,
    JSON.stringify({
      tokens: 0,
      lastRefill: 1000,
    }),
    { expirationTtl: 60 }
  );

  await withFakeNow(61_000, async () => {
    const state = await limiter.getState('chat-3');
    assert.equal(Math.floor(state.tokens), 20);
    assert.equal(state.remaining, 20);
  });
});

test('stores state in KV with 60s TTL', async () => {
  const env = { SESSIONS: new MemoryKvWithCas() };
  const limiter = new TokenBucketRateLimiter(env);

  await limiter.consume('chat-4');

  const putCall = env.SESSIONS.putCalls.at(-1);
  assert.equal(putCall.options.expirationTtl, 60);
});

test('handles concurrent consume with conditional update (only one token consumed)', async () => {
  const env = { SESSIONS: new MemoryKvWithCas() };
  const limiter = new TokenBucketRateLimiter(env, { capacity: 1, refillRate: 0 });

  const [a, b] = await Promise.all([limiter.consume('chat-5'), limiter.consume('chat-5')]);
  const allowedCount = [a, b].filter((r) => r.allowed).length;
  const deniedCount = [a, b].filter((r) => !r.allowed).length;

  assert.equal(allowedCount, 1);
  assert.equal(deniedCount, 1);
});

test('degrades gracefully when KV read fails', async () => {
  const env = {
    SESSIONS: {
      async get() {
        throw new Error('KV unavailable');
      },
      async put() {
        throw new Error('KV unavailable');
      },
    },
  };
  const limiter = new TokenBucketRateLimiter(env);

  const result = await limiter.consume('chat-6');

  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
});

test('performance: 1000 checks complete under 5 seconds', async () => {
  const env = { SESSIONS: new MemoryKvWithCas() };
  const limiter = new TokenBucketRateLimiter(env);

  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    await limiter.checkLimit(`chat-perf-${i % 20}`);
  }
  const elapsed = performance.now() - start;

  assert.ok(elapsed < 5000, `elapsed=${elapsed}`);
});

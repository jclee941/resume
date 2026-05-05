import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryTokenBuckets, createMemorySlidingWindows } from '../adapters/memory.js';

describe('@resume/shared/rate-limit/adapters/memory — TokenBuckets', () => {
  it('isolates buckets per key', () => {
    const now = 0;
    const store = createMemoryTokenBuckets({
      capacity: 3,
      refillRatePerSecond: 1,
      now: () => now,
    });

    assert.equal(store.tryConsume('alice'), true);
    assert.equal(store.tryConsume('alice'), true);
    assert.equal(store.tryConsume('alice'), true);
    assert.equal(store.tryConsume('alice'), false); // alice exhausted

    assert.equal(store.tryConsume('bob'), true); // bob is independent
    assert.equal(store.tryConsume('bob'), true);
    assert.equal(store.tryConsume('bob'), true);
    assert.equal(store.tryConsume('bob'), false);
  });

  it('refills over time', () => {
    let now = 0;
    const store = createMemoryTokenBuckets({
      capacity: 2,
      refillRatePerSecond: 2, // 2 tokens / sec → 1 token every 500ms
      now: () => now,
    });
    assert.equal(store.tryConsume('k'), true);
    assert.equal(store.tryConsume('k'), true);
    assert.equal(store.tryConsume('k'), false);

    now += 500; // refill 1 token
    assert.equal(store.tryConsume('k'), true);
    assert.equal(store.tryConsume('k'), false);
  });

  it('supports peek without spending', () => {
    const now = 0;
    const store = createMemoryTokenBuckets({
      capacity: 5,
      refillRatePerSecond: 1,
      now: () => now,
    });
    store.tryConsume('k', 2);
    const snap = store.peek('k');
    assert.equal(snap.tokens, 3);
    assert.equal(snap.capacity, 5);
  });

  it('peek on an unknown key returns full capacity (no allocation)', () => {
    const store = createMemoryTokenBuckets({ capacity: 5, refillRatePerSecond: 1 });
    const snap = store.peek('never-seen');
    assert.equal(snap.tokens, 5);
  });

  it('reset(key) drops a single bucket', () => {
    const now = 0;
    const store = createMemoryTokenBuckets({ capacity: 2, refillRatePerSecond: 1, now: () => now });
    store.tryConsume('k');
    store.tryConsume('k');
    assert.equal(store.tryConsume('k'), false);
    store.reset('k');
    assert.equal(store.tryConsume('k'), true);
  });

  it('clear() drops all buckets', () => {
    const now = 0;
    const store = createMemoryTokenBuckets({ capacity: 1, refillRatePerSecond: 1, now: () => now });
    store.tryConsume('a');
    store.tryConsume('b');
    assert.equal(store.tryConsume('a'), false);
    assert.equal(store.tryConsume('b'), false);
    store.clear();
    assert.equal(store.tryConsume('a'), true);
    assert.equal(store.tryConsume('b'), true);
  });
});

describe('@resume/shared/rate-limit/adapters/memory — SlidingWindows', () => {
  it('isolates windows per key', () => {
    const now = 0;
    const store = createMemorySlidingWindows({
      windowMs: 1000,
      max: 2,
      now: () => now,
    });
    assert.equal(store.tryRecord('alice'), true);
    assert.equal(store.tryRecord('alice'), true);
    assert.equal(store.tryRecord('alice'), false);

    assert.equal(store.tryRecord('bob'), true);
    assert.equal(store.tryRecord('bob'), true);
    assert.equal(store.tryRecord('bob'), false);
  });

  it('expires entries after windowMs', () => {
    let now = 0;
    const store = createMemorySlidingWindows({ windowMs: 1000, max: 1, now: () => now });
    assert.equal(store.tryRecord('k'), true);
    assert.equal(store.tryRecord('k'), false);
    now += 1001;
    assert.equal(store.tryRecord('k'), true);
  });

  it('count() returns 0 for an unseen key', () => {
    const store = createMemorySlidingWindows({ windowMs: 1000, max: 5 });
    assert.equal(store.count('never-seen'), 0);
  });

  it('retryAfterMs() returns 0 for an unseen / under-limit key', () => {
    const now = 0;
    const store = createMemorySlidingWindows({ windowMs: 1000, max: 2, now: () => now });
    assert.equal(store.retryAfterMs('never-seen'), 0);
    store.tryRecord('k');
    assert.equal(store.retryAfterMs('k'), 0);
  });

  it('retryAfterMs() returns >0 once limit is hit', () => {
    const now = 0;
    const store = createMemorySlidingWindows({ windowMs: 1000, max: 1, now: () => now });
    store.tryRecord('k');
    assert.equal(store.tryRecord('k'), false);
    const wait = store.retryAfterMs('k');
    assert.ok(wait > 0 && wait <= 1000, `expected 0 < wait <= 1000, got ${wait}`);
  });

  it('reset(key) and clear() drop windows', () => {
    const now = 0;
    const store = createMemorySlidingWindows({ windowMs: 1000, max: 1, now: () => now });
    store.tryRecord('a');
    store.tryRecord('b');
    assert.equal(store.tryRecord('a'), false);
    store.reset('a');
    assert.equal(store.tryRecord('a'), true);
    store.clear();
    assert.equal(store.tryRecord('a'), true);
    assert.equal(store.tryRecord('b'), true);
  });
});

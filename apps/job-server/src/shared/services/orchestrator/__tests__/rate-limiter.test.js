import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter, DEFAULT_PLATFORM_LIMITS, FALLBACK_LIMIT } from '../rate-limiter.js';

describe('RateLimiter', { concurrency: 1 }, () => {
  let now;

  beforeEach(() => {
    mock.restoreAll();
    now = 1_000_000;
  });

  afterEach(() => {
    mock.restoreAll();
    mock.timers.reset();
  });

  it('exports default and fallback limits', () => {
    assert.ok(DEFAULT_PLATFORM_LIMITS.wanted);
    assert.equal(typeof DEFAULT_PLATFORM_LIMITS.wanted.requestsPerMinute, 'number');
    assert.deepEqual(FALLBACK_LIMIT, {
      requestsPerMinute: 10,
      burstSize: 2,
      cooldownMs: 10000,
    });
  });

  it('returns wait time while paused and clears expired pause', () => {
    mock.method(Date, 'now', () => now);
    const limiter = new RateLimiter({
      alpha: { requestsPerMinute: 60, burstSize: 1, cooldownMs: 0 },
    });

    limiter.pause('alpha', 5000);
    assert.equal(limiter.isPaused('alpha'), true);
    assert.equal(limiter.getWaitTime('alpha'), 5000);

    now += 6000;
    assert.equal(limiter.getWaitTime('alpha'), 0);
    assert.equal(limiter.isPaused('alpha'), false);
  });

  it('returns wait time for sliding window saturation', async () => {
    mock.method(Date, 'now', () => now);
    const limiter = new RateLimiter({
      alpha: { requestsPerMinute: 1, burstSize: 1, cooldownMs: 0 },
    });

    await limiter.acquire('alpha');
    assert.equal(limiter.getWaitTime('alpha'), 60000);
  });

  it('returns wait time for depleted token bucket and cooldown', async () => {
    mock.method(Date, 'now', () => now);

    const tokenLimiter = new RateLimiter({
      alpha: { requestsPerMinute: 60, burstSize: 1, cooldownMs: 0 },
    });
    await tokenLimiter.acquire('alpha');
    assert.equal(tokenLimiter.getWaitTime('alpha'), 1000);

    const cooldownLimiter = new RateLimiter({
      beta: { requestsPerMinute: 1000, burstSize: 10, cooldownMs: 5000 },
    });
    await cooldownLimiter.acquire('beta');
    now += 1000;
    assert.equal(cooldownLimiter.getWaitTime('beta'), 4000);
  });

  it('acquire proceeds immediately and serializes pending acquires with timers', async () => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const limiter = new RateLimiter({
      alpha: { requestsPerMinute: 1000, burstSize: 3, cooldownMs: 50 },
    });

    await limiter.acquire('alpha');

    const second = limiter.acquire('alpha');
    const third = limiter.acquire('alpha');

    await Promise.resolve();
    mock.timers.tick(49);
    await Promise.resolve();

    let secondDone = false;
    second.then(() => {
      secondDone = true;
    });

    await Promise.resolve();
    assert.equal(secondDone, false);

    mock.timers.tick(1);
    await second;

    await Promise.resolve();
    mock.timers.tick(50);
    await third;
  });

  it('recordResponse pauses on 429 and ignores normal responses', () => {
    mock.method(Date, 'now', () => now);
    const limiter = new RateLimiter();

    limiter.recordResponse('wanted', { statusCode: 200 });
    assert.equal(limiter.isPaused('wanted'), false);

    limiter.recordResponse('wanted', { statusCode: 429, retryAfterMs: 1234 });
    assert.equal(limiter.isPaused('wanted'), true);
    assert.equal(limiter.getWaitTime('wanted'), 1234);
  });

  it('supports pause resume and paused checks', () => {
    mock.method(Date, 'now', () => now);
    const limiter = new RateLimiter();

    limiter.pause('wanted', 500);
    assert.equal(limiter.isPaused('wanted'), true);

    limiter.resume('wanted');
    assert.equal(limiter.isPaused('wanted'), false);
  });

  it('auto-unpauses when pausedUntil is in the past', () => {
    mock.method(Date, 'now', () => now);
    const limiter = new RateLimiter();

    limiter.pause('wanted', 1000);
    now += 3001;

    assert.equal(limiter.isPaused('wanted'), false);
    assert.equal(limiter.getWaitTime('wanted'), 0);
  });

  it('returns metrics for tracked platforms', async () => {
    mock.method(Date, 'now', () => now);
    const limiter = new RateLimiter({
      alpha: { requestsPerMinute: 60, burstSize: 2, cooldownMs: 0 },
    });

    await limiter.acquire('alpha');
    limiter.pause('alpha', 1000);

    const metrics = limiter.getMetrics();
    assert.ok(metrics.alpha);
    assert.equal(typeof metrics.alpha.requestsInWindow, 'number');
    assert.equal(typeof metrics.alpha.tokensAvailable, 'number');
    assert.equal(typeof metrics.alpha.paused, 'boolean');
    assert.equal(typeof metrics.alpha.waitTime, 'number');
  });

  it('resets one platform or all platforms', async () => {
    mock.method(Date, 'now', () => now);
    const limiter = new RateLimiter({
      alpha: { requestsPerMinute: 60, burstSize: 1, cooldownMs: 0 },
      beta: { requestsPerMinute: 60, burstSize: 1, cooldownMs: 0 },
    });

    await limiter.acquire('alpha');
    await limiter.acquire('beta');

    limiter.reset('alpha');
    const singleResetMetrics = limiter.getMetrics();
    assert.equal(singleResetMetrics.alpha, undefined);
    assert.ok(singleResetMetrics.beta);

    limiter.reset();
    assert.deepEqual(limiter.getMetrics(), {});
  });
});

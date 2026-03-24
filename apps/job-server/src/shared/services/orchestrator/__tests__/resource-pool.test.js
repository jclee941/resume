import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ResourcePool } from '../resource-pool.js';

describe('ResourcePool', { concurrency: 1 }, () => {
  const pools = [];
  const created = [];
  const destroyed = [];
  let counter;

  function makePool(overrides = {}) {
    const pool = new ResourcePool({
      maxSize: 2,
      acquireTimeoutMs: 30,
      maxAge: 10_000,
      healthCheckIntervalMs: 0,
      create: async () => {
        const resource = { id: `r-${++counter}` };
        created.push(resource.id);
        return resource;
      },
      destroy: async (resource) => {
        destroyed.push(resource.id);
      },
      ...overrides,
    });
    pools.push(pool);
    return pool;
  }

  beforeEach(() => {
    mock.restoreAll();
    mock.timers.reset();
    created.length = 0;
    destroyed.length = 0;
    counter = 0;
  });

  afterEach(async () => {
    for (const pool of pools.splice(0)) {
      await pool.drain(20);
    }
    mock.restoreAll();
    mock.timers.reset();
  });

  it('throws when create or destroy are missing', () => {
    assert.throws(
      () => new ResourcePool({ destroy: async () => {} }),
      /requires create and destroy/
    );
    assert.throws(
      () => new ResourcePool({ create: async () => ({}) }),
      /requires create and destroy/
    );
  });

  it('acquires created resources and reuses idle resources', async () => {
    const pool = makePool();

    const first = await pool.acquire();
    assert.equal(first.id, 'r-1');
    assert.equal(pool.inUse, 1);

    await pool.release(first);
    assert.equal(pool.available, 1);

    const second = await pool.acquire();
    assert.strictEqual(second, first);
    assert.equal(pool.inUse, 1);
    assert.equal(pool.available, 0);
  });

  it('waits in queue and times out when full', async () => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const pool = makePool({ maxSize: 1, acquireTimeoutMs: 25 });

    const inUse = await pool.acquire();
    const waiting = pool.acquire();

    await Promise.resolve();
    assert.equal(pool.waiting, 1);

    mock.timers.tick(25);
    await assert.rejects(waiting, /Acquire timeout after 25ms/);

    await pool.release(inUse);
  });

  it('hands off released resources to waiting acquires', async () => {
    const pool = makePool({ maxSize: 1 });

    const first = await pool.acquire();
    const waiting = pool.acquire();
    await Promise.resolve();

    await pool.release(first);
    const second = await waiting;

    assert.strictEqual(second, first);
    assert.equal(pool.waiting, 0);
    assert.equal(pool.inUse, 1);
  });

  it('destroys old resources on acquire and release', async () => {
    let now = 1000;
    mock.method(Date, 'now', () => now);

    const pool = makePool({ maxAge: 100 });
    const first = await pool.acquire();
    await pool.release(first);

    now = 1300;
    const second = await pool.acquire();

    assert.notStrictEqual(second, first);
    assert.ok(destroyed.includes(first.id));

    now = 1500;
    await pool.release(second);
    assert.ok(destroyed.includes(second.id));
  });

  it('destroys invalid resources during acquire validation', async () => {
    const pool = makePool({
      maxSize: 1,
      validate: async (resource) => resource.id !== 'r-1',
    });

    const first = await pool.acquire();
    await pool.release(first);

    const second = await pool.acquire();

    assert.notStrictEqual(second, first);
    assert.ok(destroyed.includes('r-1'));
  });

  it('destroys resource and replaces it for waiters', async () => {
    const pool = makePool({ maxSize: 1 });

    const first = await pool.acquire();
    const waiter = pool.acquire();
    await Promise.resolve();

    await pool.destroy(first);
    const replacement = await waiter;

    assert.notStrictEqual(replacement.id, first.id);
    assert.ok(destroyed.includes(first.id));
    assert.equal(pool.inUse, 1);
  });

  it('treats repeated destroy call for same resource as no-op', async () => {
    const pool = makePool({ maxSize: 1 });

    const first = await pool.acquire();
    await pool.destroy(first);
    await pool.destroy(first);

    assert.equal(destroyed.filter((id) => id === first.id).length, 1);
  });

  it('drain rejects waiters and force destroys in-use resources after timeout', async () => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const pool = makePool({ maxSize: 1, acquireTimeoutMs: 200 });

    const inUse = await pool.acquire();
    const waiter = pool.acquire();
    await Promise.resolve();

    const draining = pool.drain(10);
    await Promise.resolve();

    await assert.rejects(waiter, /Pool is draining/);

    mock.timers.tick(10);
    await draining;

    assert.ok(destroyed.includes(inUse.id));
    const metrics = pool.getMetrics();
    assert.equal(metrics.draining, true);
    assert.equal(metrics.waiting, 0);
  });

  it('rejects acquire while draining and exposes metrics', async () => {
    const pool = makePool();
    const res = await pool.acquire();
    const drainPromise = pool.drain(1);

    await assert.rejects(pool.acquire(), /Pool is draining/);

    await pool.release(res);
    await drainPromise;

    const metrics = pool.getMetrics();
    assert.equal(typeof metrics.size, 'number');
    assert.equal(typeof metrics.idle, 'number');
    assert.equal(typeof metrics.inUse, 'number');
    assert.equal(typeof metrics.totalCreated, 'number');
    assert.equal(typeof metrics.totalDestroyed, 'number');
  });

  it('handles validate exceptions by destroying bad resources', async () => {
    const pool = makePool({
      maxSize: 1,
      validate: async () => {
        throw new Error('validation failed');
      },
      logger: { error: () => {} },
    });

    const first = await pool.acquire();
    await pool.release(first);

    const second = await pool.acquire();

    assert.notStrictEqual(second, first);
    assert.ok(destroyed.includes(first.id));
  });

  it('emits error when replacement creation fails in destroy', async () => {
    let createCount = 0;
    const pool = makePool({
      maxSize: 1,
      create: async () => {
        createCount += 1;
        if (createCount === 1) return { id: 'r-1' };
        throw new Error('create failed');
      },
    });

    const errors = [];
    pool.on('error', (error) => errors.push(error.message));

    const first = await pool.acquire();
    const waiter = pool.acquire();
    await Promise.resolve();

    await pool.destroy(first);
    assert.deepEqual(errors, ['create failed']);

    const drainPromise = pool.drain(5);
    await assert.rejects(waiter, /Pool is draining/);
    await drainPromise;
  });

  it('emits error when destroy callback throws and handles unknown resources', async () => {
    const pool = makePool({
      destroy: async () => {
        throw new Error('destroy failed');
      },
    });
    const errors = [];
    pool.on('error', (error) => errors.push(error.message));

    const first = await pool.acquire();
    await pool.release({ id: 'unknown' });
    await pool.destroy({ id: 'unknown' });
    await pool.destroy(first);

    assert.ok(errors.includes('destroy failed'));
  });

  it('removes idle-timeout resources during health checks', async () => {
    mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
    const events = [];
    const pool = makePool({
      maxSize: 1,
      idleTimeoutMs: 5,
      maxAge: 10_000,
      healthCheckIntervalMs: 1000,
      minSize: 0,
      validate: async () => true,
    });
    pool.on('healthCheck', (event) => events.push(event));

    const resource = await pool.acquire();
    await pool.release(resource);

    mock.timers.tick(1000);
    await Promise.resolve();
    await Promise.resolve();

    assert.ok(events.length >= 1);
    assert.ok(destroyed.includes(resource.id));
  });

  it('removes invalid resources during health checks', async () => {
    mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
    const pool = makePool({
      maxSize: 1,
      idleTimeoutMs: 10_000,
      maxAge: 10_000,
      healthCheckIntervalMs: 1000,
      minSize: 0,
      validate: async () => false,
      logger: { error: () => {} },
    });

    const resource = await pool.acquire();
    await pool.release(resource);

    mock.timers.tick(1000);
    await Promise.resolve();
    await Promise.resolve();

    assert.ok(destroyed.includes(resource.id));
  });

  it('handles validator exceptions during health checks', async () => {
    mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
    const pool = makePool({
      maxSize: 1,
      idleTimeoutMs: 10_000,
      maxAge: 10_000,
      healthCheckIntervalMs: 1000,
      minSize: 0,
      validate: async () => {
        throw new Error('validator blew up');
      },
      logger: { error: () => {} },
    });

    const resource = await pool.acquire();
    await pool.release(resource);

    mock.timers.tick(1000);
    await Promise.resolve();
    await Promise.resolve();

    assert.ok(destroyed.includes(resource.id));
  });

  it('removes over-age idle resources during health checks', async () => {
    mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
    const pool = makePool({
      maxSize: 1,
      idleTimeoutMs: 10_000,
      maxAge: 5,
      healthCheckIntervalMs: 1000,
      minSize: 0,
    });

    const resource = await pool.acquire();
    await pool.release(resource);

    mock.timers.tick(1000);
    await Promise.resolve();
    await Promise.resolve();

    assert.ok(destroyed.includes(resource.id));
  });
});

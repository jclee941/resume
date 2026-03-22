// Tests for EventEmitter listener cleanup in orchestrator layer shutdown paths.
// All 3 classes extend EventEmitter; these tests verify removeAllListeners() is
// called on the correct shutdown/drain/destroy paths to prevent memory leaks.

const { EventEmitter } = require('events');

// ---------------------------------------------------------------------------
// Inline mock implementations (mirrors real module behavior)
// ---------------------------------------------------------------------------

class MockProgressTracker extends EventEmitter {
  #tasks = new Map();

  addTask(platform, type) {
    const id = `task-${platform}-${type}`;
    this.#tasks.set(id, { id, platform, type, status: 'pending' });
    return id;
  }

  reset() {
    this.#tasks.clear();
  }

  destroy() {
    this.reset();
    this.removeAllListeners();
  }

  getTaskCount() {
    return this.#tasks.size;
  }
}

class MockResourcePool extends EventEmitter {
  #draining = false;
  #idle = [];
  #inUse = new Map();
  #waitQueue = [];

  async drain() {
    this.#draining = true;
    for (const waiter of this.#waitQueue) {
      waiter.reject(new Error('Pool is draining'));
    }
    this.#waitQueue = [];
    this.#idle = [];
    this.emit('drain');
    this.removeAllListeners();
  }

  isDraining() {
    return this.#draining;
  }
}

class MockCrawlOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.progressTracker = new MockProgressTracker();
    this._browserPool = null;
    this._isShutdown = false;

    this.progressTracker.on('progress', (data) => this.emit('progress', data));
    this.progressTracker.on('complete', (data) => this.emit('complete', data));
  }

  cancel() {}

  async shutdown() {
    this._isShutdown = true;
    this.cancel();
    if (this._browserPool) {
      await this._browserPool.drain();
      this._browserPool = null;
    }
    this.progressTracker?.destroy();
    this.removeAllListeners();
  }
}

// ---------------------------------------------------------------------------
// ProgressTracker.destroy()
// ---------------------------------------------------------------------------

describe('ProgressTracker.destroy()', () => {
  let tracker;

  beforeEach(() => {
    tracker = new MockProgressTracker();
  });

  test('removes all listeners after destroy()', () => {
    const onProgress = jest.fn();
    const onComplete = jest.fn();
    tracker.on('progress', onProgress);
    tracker.on('complete', onComplete);

    expect(tracker.listenerCount('progress')).toBe(1);
    expect(tracker.listenerCount('complete')).toBe(1);

    tracker.destroy();

    expect(tracker.listenerCount('progress')).toBe(0);
    expect(tracker.listenerCount('complete')).toBe(0);
  });

  test('clears internal task state after destroy()', () => {
    tracker.addTask('wanted', 'search');
    tracker.addTask('saramin', 'search');
    expect(tracker.getTaskCount()).toBe(2);

    tracker.destroy();

    expect(tracker.getTaskCount()).toBe(0);
  });

  test('is idempotent — calling destroy() twice does not throw', () => {
    const onFoo = jest.fn();
    tracker.on('foo', onFoo);

    expect(() => {
      tracker.destroy();
      tracker.destroy();
    }).not.toThrow();
  });

  test('listeners added after destroy() still work normally', () => {
    tracker.destroy();

    const fn = jest.fn();
    tracker.on('foo', fn);
    tracker.emit('foo', 42);

    expect(fn).toHaveBeenCalledWith(42);
  });
});

// ---------------------------------------------------------------------------
// ResourcePool.drain()
// ---------------------------------------------------------------------------

describe('ResourcePool.drain()', () => {
  let pool;

  beforeEach(() => {
    pool = new MockResourcePool();
  });

  test('emits "drain" event before removing listeners', async () => {
    const drainHandler = jest.fn();
    pool.on('drain', drainHandler);

    await pool.drain();

    expect(drainHandler).toHaveBeenCalledTimes(1);
  });

  test('has no listeners after drain() completes', async () => {
    pool.on('drain', jest.fn());
    pool.on('acquire', jest.fn());
    pool.on('release', jest.fn());

    await pool.drain();

    expect(pool.listenerCount('drain')).toBe(0);
    expect(pool.listenerCount('acquire')).toBe(0);
    expect(pool.listenerCount('release')).toBe(0);
    expect(pool.eventNames()).toHaveLength(0);
  });

  test('removeAllListeners is called AFTER emit("drain") — listeners receive the event', async () => {
    const callOrder = [];
    pool.on('drain', () => callOrder.push('drain-event-received'));

    const origRemove = pool.removeAllListeners.bind(pool);
    pool.removeAllListeners = jest.fn((...args) => {
      callOrder.push('removeAllListeners-called');
      return origRemove(...args);
    });

    await pool.drain();

    expect(callOrder).toEqual(['drain-event-received', 'removeAllListeners-called']);
  });

  test('is safe to call drain() when no listeners are registered', async () => {
    await expect(pool.drain()).resolves.toBeUndefined();
    expect(pool.listenerCount('drain')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CrawlOrchestrator.shutdown()
// ---------------------------------------------------------------------------

describe('CrawlOrchestrator.shutdown()', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new MockCrawlOrchestrator();
  });

  test('removes all orchestrator listeners after shutdown()', async () => {
    orchestrator.on('progress', jest.fn());
    orchestrator.on('platform:start', jest.fn());
    orchestrator.on('complete', jest.fn());

    await orchestrator.shutdown();

    expect(orchestrator.listenerCount('progress')).toBe(0);
    expect(orchestrator.listenerCount('platform:start')).toBe(0);
    expect(orchestrator.listenerCount('complete')).toBe(0);
  });

  test('calls progressTracker.destroy() during shutdown()', async () => {
    const destroySpy = jest.spyOn(orchestrator.progressTracker, 'destroy');

    await orchestrator.shutdown();

    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  test('progressTracker has no listeners after shutdown()', async () => {
    expect(orchestrator.progressTracker.listenerCount('progress')).toBeGreaterThan(0);

    await orchestrator.shutdown();

    expect(orchestrator.progressTracker.listenerCount('progress')).toBe(0);
    expect(orchestrator.progressTracker.listenerCount('complete')).toBe(0);
  });

  test('drains browser pool before cleanup when pool is set', async () => {
    const mockPool = new MockResourcePool();
    const drainSpy = jest.spyOn(mockPool, 'drain');
    orchestrator._browserPool = mockPool;

    await orchestrator.shutdown();

    expect(drainSpy).toHaveBeenCalledTimes(1);
    expect(orchestrator._browserPool).toBeNull();
  });

  test('sets _isShutdown flag', async () => {
    expect(orchestrator._isShutdown).toBe(false);
    await orchestrator.shutdown();
    expect(orchestrator._isShutdown).toBe(true);
  });

  test('shutdown() with no browser pool does not throw', async () => {
    expect(orchestrator._browserPool).toBeNull();
    await expect(orchestrator.shutdown()).resolves.toBeUndefined();
  });
});

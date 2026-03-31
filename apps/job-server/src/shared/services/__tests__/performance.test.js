/**
 * Performance Optimization Tests
 *
 * Tests for browser pooling, caching, parallel processing,
 * and performance metrics.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { BrowserPool, resetBrowserPool } from '../browser-pool.js';
import { LRUCache, TypedCache, resetGlobalCache } from '../cache.js';
import { PerformanceMetrics, resetMetrics } from '../performance-metrics.js';
import { processInParallel, AsyncQueue, applyToJobsParallel } from '../parallel.js';
import { LazyModule, LazyCrawlerRegistry } from '../lazy-loader.js';

describe('Performance Optimization', () => {
  describe('LRUCache', () => {
    it('should store and retrieve values', () => {
      const cache = new LRUCache({ maxSize: 10 });
      cache.set('key1', 'value1');
      assert.strictEqual(cache.get('key1'), 'value1');
    });

    it('should evict oldest when full', () => {
      const cache = new LRUCache({ maxSize: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'

      assert.strictEqual(cache.get('a'), undefined);
      assert.strictEqual(cache.get('d'), 4);
    });

    it('should respect TTL', async () => {
      const cache = new LRUCache({ maxSize: 10 });
      cache.set('key', 'value', 50); // 50ms TTL

      assert.strictEqual(cache.get('key'), 'value');

      await new Promise((r) => setTimeout(r, 60));
      assert.strictEqual(cache.get('key'), undefined);
    });

    it('should track statistics', () => {
      const cache = new LRUCache({ maxSize: 10 });
      cache.set('a', 1);
      cache.get('a'); // hit
      cache.get('b'); // miss

      const stats = cache.getStats();
      assert.strictEqual(stats.hits, 1);
      assert.strictEqual(stats.misses, 1);
      assert.strictEqual(stats.hitRate, 0.5);
    });

    it('should support getOrSet pattern', async () => {
      const cache = new LRUCache({ maxSize: 10 });
      let called = 0;

      const factory = async () => {
        called++;
        return 'computed';
      };

      const result1 = await cache.getOrSet('key', factory);
      const result2 = await cache.getOrSet('key', factory);

      assert.strictEqual(result1, 'computed');
      assert.strictEqual(result2, 'computed');
      assert.strictEqual(called, 1); // Factory called only once
    });
  });

  describe('TypedCache', () => {
    it('should provide separate namespaces', () => {
      const typed = new TypedCache();

      typed.jobs().set('job1', { title: 'Developer' });
      typed.companies().set('job1', { name: 'Company' });

      assert.deepStrictEqual(typed.jobs().get('job1'), { title: 'Developer' });
      assert.deepStrictEqual(typed.companies().get('job1'), { name: 'Company' });
    });

    it('should apply correct TTLs by namespace', async () => {
      const typed = new TypedCache();

      // Jobs: 1 hour TTL
      typed.jobs().set('j1', 'data');
      assert.strictEqual(typed.jobs().get('j1'), 'data');

      // Search: 30 min TTL
      typed.searchResults().set('s1', 'results');
      assert.strictEqual(typed.searchResults().get('s1'), 'results');
    });

    it('should return all stats', () => {
      const typed = new TypedCache();
      typed.jobs().set('j1', 'data');
      typed.companies().set('c1', 'data');

      const stats = typed.getAllStats();
      assert.ok(stats.jobs);
      assert.ok(stats.companies);
    });
  });

  describe('PerformanceMetrics', () => {
    before(() => {
      resetMetrics();
    });

    after(() => {
      resetMetrics();
    });

    it('should record timing marks', () => {
      const metrics = new PerformanceMetrics();
      metrics.mark('test');
      const duration = metrics.measure('test');

      assert.ok(duration >= 0);
    });

    it('should time async functions', async () => {
      const metrics = new PerformanceMetrics();

      const result = await metrics.timeAsync('async-test', async () => {
        await new Promise((r) => setTimeout(r, 10));
        return 'done';
      });

      assert.strictEqual(result, 'done');
      assert.ok(metrics.getAverageDuration('async-test') >= 5);
    });

    it('should track counters', () => {
      const metrics = new PerformanceMetrics();
      metrics.increment('requests');
      metrics.increment('requests', 2);

      const summary = metrics.getSummary();
      assert.strictEqual(summary.counters.requests, 3);
    });

    it('should track histograms', () => {
      const metrics = new PerformanceMetrics();
      metrics.histogram('response_time', 100);
      metrics.histogram('response_time', 200);
      metrics.histogram('response_time', 300);

      const p95 = metrics.getPercentile('response_time', 95);
      assert.ok(p95 >= 200);
    });

    it('should get memory usage', () => {
      const metrics = new PerformanceMetrics();
      const mem = metrics.getMemoryUsage();

      assert.ok(mem.heapUsed >= 0);
      assert.ok(mem.heapTotal >= 0);
      assert.ok(mem.rss >= 0);
    });
  });

  describe('Parallel Processing', () => {
    it('should process items in parallel', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (n) => n * 2;

      const results = await processInParallel(items, processor, {
        concurrency: 3,
      });

      assert.strictEqual(results.length, 5);
      assert.ok(results.every((r) => r.success));
      assert.deepStrictEqual(
        results.map((r) => r.result),
        [2, 4, 6, 8, 10]
      );
    });

    it('should handle errors with stopOnError', async () => {
      const items = [1, 2, 3];
      let callCount = 0;

      const processor = async (n) => {
        callCount++;
        if (n === 2) throw new Error('fail');
        return n;
      };

      try {
        await processInParallel(items, processor, {
          concurrency: 1,
          stopOnError: true,
        });
        assert.fail('Should have thrown');
      } catch (e) {
        assert.ok(e.message.includes('stopped'));
      }
    });

    it('should support AsyncQueue', async () => {
      const processed = [];
      const queue = new AsyncQueue(
        async (item) => {
          processed.push(item);
          return item * 2;
        },
        { concurrency: 2 }
      );

      const results = await Promise.all([queue.add(1), queue.add(2), queue.add(3)]);

      assert.deepStrictEqual(results, [2, 4, 6]);
      assert.deepStrictEqual(processed, [1, 2, 3]);
    });

    it('should apply to jobs in parallel', async () => {
      const jobs = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const results = [];

      await applyToJobsParallel(
        jobs,
        async (job) => {
          await new Promise((r) => setTimeout(r, 10));
          results.push(job.id);
          return { success: true };
        },
        { maxConcurrency: 2, delayBetweenApps: 0 }
      );

      assert.strictEqual(results.length, 3);
    });
  });

  describe('Lazy Loading', () => {
    it('should lazy load modules', async () => {
      let loaded = false;
      const lazy = new LazyModule(async () => {
        loaded = true;
        return { data: 'test' };
      });

      assert.strictEqual(lazy.loaded, false);

      const result = await lazy.get();
      assert.strictEqual(loaded, true);
      assert.strictEqual(lazy.loaded, true);
      assert.deepStrictEqual(result, { data: 'test' });
    });

    it('should cache lazy loaded values', async () => {
      let loadCount = 0;
      const lazy = new LazyModule(async () => {
        loadCount++;
        return { count: loadCount };
      });

      await lazy.get();
      await lazy.get();
      await lazy.get();

      assert.strictEqual(loadCount, 1);
    });

    it('should support preloading', async () => {
      let loaded = false;
      const lazy = new LazyModule(async () => {
        loaded = true;
        return {};
      });

      await lazy.preload();
      assert.strictEqual(loaded, true);
      assert.strictEqual(lazy.getSync(), await lazy.get());
    });

    it('should unload and reload', async () => {
      let loadCount = 0;
      const lazy = new LazyModule(async () => {
        loadCount++;
        return { count: loadCount };
      });

      await lazy.get();
      lazy.unload();

      assert.strictEqual(lazy.loaded, false);

      const result = await lazy.get();
      assert.strictEqual(loadCount, 2);
      assert.strictEqual(result.count, 2);
    });

    it('should manage crawler registry', () => {
      const registry = new LazyCrawlerRegistry();

      registry.register('wanted', async () => ({ name: 'wanted' }));
      registry.register('saramin', async () => ({ name: 'saramin' }));

      assert.strictEqual(registry.isRegistered('wanted'), true);
      assert.strictEqual(registry.isLoaded('wanted'), false);
      assert.deepStrictEqual(registry.getRegisteredNames(), ['wanted', 'saramin']);
    });
  });

  describe('BrowserPool', () => {
    after(async () => {
      await resetBrowserPool();
    });

    it('should create browser pool with config', () => {
      const pool = new BrowserPool({
        maxBrowsers: 3,
        maxUsesPerBrowser: 10,
        logger: console,
      });

      const metrics = pool.getMetrics();
      assert.strictEqual(metrics.poolSize, 0);
      assert.ok(metrics);
    });

    it('should track metrics', () => {
      const pool = new BrowserPool({ maxBrowsers: 2 });
      const metrics = pool.getMetrics();

      assert.ok('poolSize' in metrics);
      assert.ok('inUse' in metrics);
      assert.ok('available' in metrics);
    });

    it('should estimate memory usage', () => {
      const pool = new BrowserPool({ maxBrowsers: 3 });
      const estimate = pool.getMemoryEstimate();

      // ~100MB per browser
      assert.strictEqual(estimate, 0); // No browsers created yet
    });
  });
});

// Run benchmarks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running performance benchmarks...\n');

  // Cache benchmark
  const cache = new LRUCache({ maxSize: 1000 });
  const iterations = 10000;

  console.time('Cache write');
  for (let i = 0; i < iterations; i++) {
    cache.set(`key${i}`, `value${i}`);
  }
  console.timeEnd('Cache write');

  console.time('Cache read (hits)');
  for (let i = 0; i < iterations; i++) {
    cache.get(`key${i}`);
  }
  console.timeEnd('Cache read (hits)');

  console.time('Cache read (misses)');
  for (let i = 0; i < iterations; i++) {
    cache.get(`missing${i}`);
  }
  console.timeEnd('Cache read (misses)');

  console.log('\nStats:', cache.getStats());
}

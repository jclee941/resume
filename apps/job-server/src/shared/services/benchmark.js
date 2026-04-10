/**
 * Performance Benchmarks - Benchmarking utilities for performance optimization
 *
 * Measures and compares performance before/after optimization.
 */

import { performance } from 'perf_hooks';

/**
 * @typedef {Object} BenchmarkResult
 * @property {string} name
 * @property {number} iterations
 * @property {number} totalTime
 * @property {number} avgTime
 * @property {number} minTime
 * @property {number} maxTime
 * @property {number} opsPerSecond
 */

/**
 * Run benchmark comparison
 * @param {string} name
 * @param {Function} fn
 * @param {Object} options
 * @returns {Promise<BenchmarkResult>}
 */
export async function benchmark(name, fn, options = {}) {
  const { iterations = 100, warmup = 10 } = options;

  // Warmup
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // GC if available
  if (global.gc) {
    global.gc();
  }

  const startMemory = process.memoryUsage();
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const endMemory = process.memoryUsage();

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = 1000 / avgTime;

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    opsPerSecond,
    memoryDelta: {
      heapUsed: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
      rss: (endMemory.rss - startMemory.rss) / 1024 / 1024,
    },
  };
}

/**
 * Compare two implementations
 * @param {string} name
 * @param {Function} baseline
 * @param {Function} optimized
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function compare(name, baseline, optimized, options = {}) {
  console.log(`\n📊 Benchmarking: ${name}`);
  console.log('='.repeat(50));

  const baselineResult = await benchmark(`${name} (baseline)`, baseline, options);
  const optimizedResult = await benchmark(`${name} (optimized)`, optimized, options);

  const speedup = baselineResult.avgTime / optimizedResult.avgTime;
  const improvement = ((speedup - 1) * 100).toFixed(1);

  console.log('\nBaseline:');
  console.log(`  Avg: ${baselineResult.avgTime.toFixed(3)}ms`);
  console.log(`  Min: ${baselineResult.minTime.toFixed(3)}ms`);
  console.log(`  Max: ${baselineResult.maxTime.toFixed(3)}ms`);
  console.log(`  Ops/s: ${baselineResult.opsPerSecond.toFixed(2)}`);

  console.log('\nOptimized:');
  console.log(`  Avg: ${optimizedResult.avgTime.toFixed(3)}ms`);
  console.log(`  Min: ${optimizedResult.minTime.toFixed(3)}ms`);
  console.log(`  Max: ${optimizedResult.maxTime.toFixed(3)}ms`);
  console.log(`  Ops/s: ${optimizedResult.opsPerSecond.toFixed(2)}`);

  console.log('\nImprovement:');
  console.log(`  Speedup: ${speedup.toFixed(2)}x`);
  console.log(`  Faster by: ${improvement}%`);

  return {
    name,
    baseline: baselineResult,
    optimized: optimizedResult,
    speedup,
    improvement: parseFloat(improvement),
  };
}

/**
 * Memory stress test
 * @param {Function} fn
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function memoryStressTest(fn, options = {}) {
  const { iterations = 100, checkInterval = 10 } = options;

  const memorySnapshots = [];

  if (global.gc) {
    global.gc();
  }

  const startMemory = process.memoryUsage();

  for (let i = 0; i < iterations; i++) {
    await fn();

    if (i % checkInterval === 0) {
      memorySnapshots.push({
        iteration: i,
        ...process.memoryUsage(),
      });
    }
  }

  const endMemory = process.memoryUsage();

  const peakHeap = Math.max(...memorySnapshots.map((s) => s.heapUsed));
  const peakRss = Math.max(...memorySnapshots.map((s) => s.rss));

  return {
    iterations,
    startMemory,
    endMemory,
    peakHeapUsed: peakHeap,
    peakRss,
    memoryGrowth: endMemory.heapUsed - startMemory.heapUsed,
    snapshots: memorySnapshots,
  };
}

/**
 * Concurrent load test
 * @param {Function} fn
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function loadTest(fn, options = {}) {
  const { concurrent = 10, requests = 100 } = options;

  const results = [];
  const errors = [];

  const startTime = performance.now();

  // Create workers
  const workers = Array(concurrent)
    .fill(null)
    .map(async () => {
      while (results.length + errors.length < requests) {
        const reqStart = performance.now();
        try {
          await fn();
          results.push(performance.now() - reqStart);
        } catch (error) {
          errors.push({ time: performance.now() - reqStart, error });
        }
      }
    });

  await Promise.all(workers);

  const totalTime = performance.now() - startTime;

  const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
  const minTime = Math.min(...results);
  const maxTime = Math.max(...results);
  const sorted = results.sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return {
    concurrent,
    requests: results.length,
    errors: errors.length,
    totalTime,
    rps: (results.length / totalTime) * 1000,
    avgTime,
    minTime,
    maxTime,
    p50,
    p95,
    p99,
  };
}

/**
 * Format benchmark results for display
 * @param {BenchmarkResult} result
 * @returns {string}
 */
export function formatBenchmarkResult(result) {
  return `
${result.name}
  Iterations: ${result.iterations}
  Total: ${result.totalTime.toFixed(2)}ms
  Average: ${result.avgTime.toFixed(3)}ms
  Min: ${result.minTime.toFixed(3)}ms
  Max: ${result.maxTime.toFixed(3)}ms
  Ops/s: ${result.opsPerSecond.toFixed(2)}
  Memory: +${result.memoryDelta.heapUsed.toFixed(2)}MB heap
`;
}

/**
 * Assert performance target
 * @param {BenchmarkResult} result
 * @param {Object} targets
 */
export function assertPerformance(result, targets) {
  const failures = [];

  if (targets.maxTime && result.avgTime > targets.maxTime) {
    failures.push(
      `Average time ${result.avgTime.toFixed(3)}ms exceeds target ${targets.maxTime}ms`
    );
  }

  if (targets.minOpsPerSecond && result.opsPerSecond < targets.minOpsPerSecond) {
    failures.push(
      `Ops/s ${result.opsPerSecond.toFixed(2)} below target ${targets.minOpsPerSecond}`
    );
  }

  if (targets.maxMemoryMB && result.memoryDelta.heapUsed > targets.maxMemoryMB) {
    failures.push(
      `Memory ${result.memoryDelta.heapUsed.toFixed(2)}MB exceeds target ${targets.maxMemoryMB}MB`
    );
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

export default {
  benchmark,
  compare,
  memoryStressTest,
  loadTest,
  formatBenchmarkResult,
  assertPerformance,
};

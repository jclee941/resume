/**
 * Shared Services - Domain logic services
 *
 * Exports all service modules for the job automation system.
 */

// Performance optimization services
export { BrowserPool, getBrowserPool, resetBrowserPool } from './browser-pool.js';
export { LRUCache, TypedCache, getGlobalCache, resetGlobalCache } from './cache.js';
export {
  PerformanceMetrics,
  getMetrics,
  resetMetrics,
  timed,
  withTiming,
  logMemoryUsage,
} from './performance-metrics.js';
export {
  processInParallel,
  AsyncQueue,
  WorkerPool,
  batchProcess,
  applyToJobsParallel,
} from './parallel.js';

// Domain services
export { ApplyOrchestrator } from './apply/orchestrator.js';
export { JobFilter } from './apply/job-filter.js';
export { UnifiedApplySystem } from './apply/unified-apply-system.js';

// Lazy loading utilities
export {
  LazyModule,
  LazyCrawlerRegistry,
  ServiceLocator,
  DynamicImporter,
  StreamProcessor,
  getCrawlerRegistry,
  lazy,
} from './lazy-loader.js';

// Optimized orchestrator
export { OptimizedApplyOrchestrator } from './apply/optimized-orchestrator.js';

// Benchmark utilities
export {
  benchmark,
  compare,
  memoryStressTest,
  loadTest,
  formatBenchmarkResult,
  assertPerformance,
} from './benchmark.js';
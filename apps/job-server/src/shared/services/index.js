/**
 * Shared Services - Domain logic services
 *
 * Exports all service modules for the job automation system.
 */

// Performance optimization services
export { BrowserPool, createBrowserPool } from './browser-pool.js';
export { LRUCache, TypedCache, createCache } from './cache.js';
export {
  PerformanceMetrics,
  createGlobalMetrics,
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
export {
  ApplicationService,
  createApplicationService,
} from './applications/application-service.js';
export { AuthService, createAuthService } from './auth/auth-service.js';
export { JobFilter } from './apply/job-filter.js';
export { StatsService, createStatsService } from './stats/stats-service.js';
export { UnifiedApplySystem } from './apply/unified-apply-system.js';

// Lazy loading utilities
export {
  LazyModule,
  LazyCrawlerRegistry,
  ServiceLocator,
  DynamicImporter,
  StreamProcessor,
  lazy,
} from './lazy-loader.js';

// Optimized orchestrator
export { OptimizedApplyOrchestrator } from './apply/optimized-orchestrator/core.js';

// Benchmark utilities
export {
  benchmark,
  compare,
  memoryStressTest,
  loadTest,
  formatBenchmarkResult,
  assertPerformance,
} from './benchmark.js';

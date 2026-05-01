/**
 * Shared Services - Domain logic services
 *
 * Exports all service modules for the job automation system.
 */

// Performance optimization services
export {
  BrowserPool,
  createBrowserPool,
  getBrowserPool,
  resetBrowserPool,
} from './browser-pool.js';
export {
  LRUCache,
  TypedCache,
  createCache,
  getGlobalCache,
  setGlobalCache,
  resetGlobalCache,
} from './cache.js';
export {
  PerformanceMetrics,
  createGlobalMetrics,
  createMetrics,
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
export {
  ApplicationService,
  createApplicationService,
  getApplicationService,
} from './applications/application-service.js';
export { AuthService, createAuthService, getAuthService } from './auth/auth-service.js';
export { JobFilter } from './apply/job-filter.js';
export { StatsService, createStatsService, getStatsService } from './stats/stats-service.js';
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

import { getBrowserPool } from '../../browser-pool.js';
import { getGlobalCache } from '../../cache.js';
import { getMetrics } from '../../performance-metrics.js';
import {
  applyInBatchesWithStrategy,
  applySingleJobWithMetrics,
  applyToJobsWithStrategy,
} from './execution.js';
import { initOptimizedApplyStats } from './error-handler.js';
import { searchJobsWithStrategy } from './strategies.js';

export class OptimizedApplyOrchestrator {
  #crawler;
  #applier;
  #appManager;
  #config;
  #stats;
  #browserPool;
  #cache;
  #metrics;
  #logger;

  constructor(crawler, applier, appManager, config = {}) {
    this.#crawler = crawler;
    this.#applier = applier;
    this.#appManager = appManager;
    this.#logger = config.logger ?? console;
    this.#config = {
      maxDailyApplications: config.maxDailyApplications || 20,
      enabledPlatforms: config.enabledPlatforms || ['wanted'],
      parallelSearch: config.parallelSearch !== false,
      parallelApply: config.parallelApply !== false,
      maxConcurrentApplies: config.maxConcurrentApplies || 2,
      delayBetweenApplies: config.delayBetweenApplies || 3000,
      useBrowserPool: config.useBrowserPool !== false,
      useCache: config.useCache !== false,
      ...config,
    };

    this.#browserPool = getBrowserPool({
      maxBrowsers: config.maxBrowsers || 3,
      maxUsesPerBrowser: config.maxUsesPerBrowser || 50,
      logger: this.#logger,
    });

    this.#cache = getGlobalCache();
    this.#metrics = getMetrics({ logger: this.#logger });
    this.#stats = initOptimizedApplyStats();

    this.#metrics.startSampling(10000);
  }

  async searchJobs(keywords, options = {}) {
    return searchJobsWithStrategy({
      cache: this.#cache,
      config: this.#config,
      crawler: this.#crawler,
      keywords,
      logger: this.#logger,
      metrics: this.#metrics,
      options,
      stats: this.#stats,
    });
  }

  async applyToJobs(jobs, dryRun = true) {
    return applyToJobsWithStrategy(this.#executionContext(jobs, { dryRun }));
  }

  async applyInBatches(jobs, options = {}) {
    return applyInBatchesWithStrategy(this.#executionContext(jobs, { options }));
  }

  async getJobDetail(jobId, fetchFn) {
    if (!this.#config.useCache) {
      return fetchFn(jobId);
    }

    const cacheKey = `job:${jobId}`;
    return this.#cache.jobs().getOrSet(cacheKey, () => fetchFn(jobId));
  }

  async getCompanyInfo(companyId, fetchFn) {
    if (!this.#config.useCache) {
      return fetchFn(companyId);
    }

    const cacheKey = `company:${companyId}`;
    return this.#cache.companies().getOrSet(cacheKey, () => fetchFn(companyId));
  }

  getStats() {
    const baseStats = {
      ...this.#stats,
      duration: this.#stats.endTime ? this.#stats.endTime - this.#stats.startTime : null,
    };

    return {
      ...baseStats,
      browserPool: this.#browserPool.getMetrics(),
      cache: this.#cache.getAllStats(),
      metrics: this.#metrics.getSummary(),
    };
  }

  getPerformanceReport() {
    return {
      stats: this.getStats(),
      timings: this.#metrics.getSummary().timings,
      memory: this.#metrics.getMemoryUsage(),
    };
  }

  reset() {
    this.#stats = initOptimizedApplyStats();
    this.#metrics.reset();
  }

  updateConfig(updates) {
    Object.assign(this.#config, updates);
  }

  async destroy() {
    this.#metrics.stopSampling();
    await this.#browserPool.closeAll();
    this.#metrics.logSummary();
  }

  #executionContext(jobs, overrides = {}) {
    return {
      appManager: this.#appManager,
      applier: this.#applier,
      applySingleJob: (job) => this.#applyToSingleJob(job),
      browserPool: this.#browserPool,
      config: this.#config,
      jobs,
      logger: this.#logger,
      metrics: this.#metrics,
      stats: this.#stats,
      ...overrides,
    };
  }

  #applyToSingleJob(job) {
    return applySingleJobWithMetrics({
      applier: this.#applier,
      job,
      logger: this.#logger,
      metrics: this.#metrics,
      stats: this.#stats,
    });
  }
}

export default OptimizedApplyOrchestrator;

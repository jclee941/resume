import { createBrowserPool } from '../../browser-pool.js';
import { createCache } from '../../cache.js';
import { createGlobalMetrics } from '../../metrics/global-metrics.js';
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
    const { browserPool, cache, metrics, ...settings } = config;
    this.#crawler = crawler;
    this.#applier = applier;
    this.#appManager = appManager;
    this.#logger = settings.logger ?? console;
    this.#config = {
      maxDailyApplications: settings.maxDailyApplications || 20,
      enabledPlatforms: settings.enabledPlatforms || ['wanted'],
      parallelSearch: settings.parallelSearch !== false,
      parallelApply: settings.parallelApply !== false,
      maxConcurrentApplies: settings.maxConcurrentApplies || 2,
      delayBetweenApplies: settings.delayBetweenApplies || 3000,
      useBrowserPool: settings.useBrowserPool !== false,
      useCache: settings.useCache !== false,
      ...settings,
    };

    this.#browserPool =
      browserPool ??
      createBrowserPool({
        maxBrowsers: settings.maxBrowsers || 3,
        maxUsesPerBrowser: settings.maxUsesPerBrowser || 50,
        logger: this.#logger,
      });

    this.#cache = cache ?? createCache();
    this.#metrics = metrics ?? createGlobalMetrics({ logger: this.#logger });
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

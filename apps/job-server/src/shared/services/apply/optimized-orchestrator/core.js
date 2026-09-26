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

/**
 * @typedef {import('./strategies.js').StrategyCrawler} OrchestratorCrawler
 * @typedef {import('./strategies.js').StrategyOptions} OrchestratorSearchOptions
 * @typedef {import('./execution.js').Applier} OrchestratorApplier
 * @typedef {NonNullable<import('./execution.js').ExecutionContext['appManager']>} OrchestratorAppManager
 * @typedef {import('./error-handler.js').OrchestratorJob} OrchestratorJob
 * @typedef {Parameters<typeof applyInBatchesWithStrategy>[0]['options']} BatchOptions
 * @typedef {import('./execution.js').ExecutionContext['logger']
 *   & import('./strategies.js').StrategyLogger} OrchestratorLogger
 *
 * @typedef {{
 *   browserPool?: ReturnType<typeof createBrowserPool>;
 *   cache?: ReturnType<typeof createCache>;
 *   metrics?: ReturnType<typeof createGlobalMetrics>;
 *   logger?: OrchestratorLogger;
 *   maxDailyApplications?: number;
 *   enabledPlatforms?: string[];
 *   parallelSearch?: boolean;
 *   parallelApply?: boolean;
 *   maxConcurrentApplies?: number;
 *   delayBetweenApplies?: number;
 *   useBrowserPool?: boolean;
 *   useCache?: boolean;
 *   maxBrowsers?: number;
 *   maxUsesPerBrowser?: number;
 * }} OptimizedApplyConfig
 */

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

  /**
   * @param {OrchestratorCrawler} crawler
   * @param {OrchestratorApplier} applier
   * @param {OrchestratorAppManager} appManager
   * @param {OptimizedApplyConfig} [config]
   */
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

  /**
   * @param {string[]} keywords
   * @param {OrchestratorSearchOptions} [options]
   */
  async searchJobs(keywords, options = {}) {
    return searchJobsWithStrategy({
      // The search tier only ever stores the job arrays searchJobsWithStrategy writes.
      cache: /** @type {import('./strategies.js').StrategyCache} */ (this.#cache),
      config: this.#config,
      crawler: this.#crawler,
      keywords,
      logger: this.#logger,
      metrics: this.#metrics,
      options,
      stats: this.#stats,
    });
  }

  /**
   * @param {OrchestratorJob[]} jobs
   * @param {boolean} [dryRun]
   */
  async applyToJobs(jobs, dryRun = true) {
    return applyToJobsWithStrategy(this.#executionContext(jobs, { dryRun }));
  }

  /**
   * @param {OrchestratorJob[]} jobs
   * @param {BatchOptions} [options]
   */
  async applyInBatches(jobs, options = {}) {
    return applyInBatchesWithStrategy(
      /** @type {Parameters<typeof applyInBatchesWithStrategy>[0]} */ (
        this.#executionContext(jobs, { options })
      )
    );
  }

  /**
   * @template T
   * @param {string | number} jobId
   * @param {(id: string | number) => Promise<T>} fetchFn
   * @returns {Promise<T>}
   */
  async getJobDetail(jobId, fetchFn) {
    if (!this.#config.useCache) {
      return fetchFn(jobId);
    }

    const cacheKey = `job:${jobId}`;
    return this.#cache.jobs().getOrSet(cacheKey, () => fetchFn(jobId));
  }

  /**
   * @template T
   * @param {string | number} companyId
   * @param {(id: string | number) => Promise<T>} fetchFn
   * @returns {Promise<T>}
   */
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
      // endTime is only set after a run that stamped startTime.
      duration: this.#stats.endTime
        ? this.#stats.endTime - /** @type {number} */ (this.#stats.startTime)
        : null,
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

  /**
   * @param {Partial<OptimizedApplyConfig>} updates
   */
  updateConfig(updates) {
    Object.assign(this.#config, updates);
  }

  async destroy() {
    this.#metrics.stopSampling();
    await this.#browserPool.closeAll();
    this.#metrics.logSummary();
  }

  /**
   * @param {OrchestratorJob[]} jobs
   * @param {{ dryRun?: boolean; options?: BatchOptions }} [overrides]
   */
  #executionContext(jobs, overrides = {}) {
    return {
      appManager: this.#appManager,
      applier: this.#applier,
      applySingleJob: (/** @type {OrchestratorJob} */ job) => this.#applyToSingleJob(job),
      browserPool: this.#browserPool,
      config: this.#config,
      jobs,
      logger: this.#logger,
      metrics: this.#metrics,
      stats: this.#stats,
      ...overrides,
    };
  }

  /**
   * @param {OrchestratorJob} job
   */
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

/**
 * Optimized Apply Orchestrator - Performance-enhanced application orchestration
 *
 * Uses browser pooling, caching, and parallel processing for improved
 * performance while maintaining rate limiting and safety.
 */

import { getBrowserPool } from './browser-pool.js';
import { getGlobalCache } from './cache.js';
import { getMetrics } from './performance-metrics.js';
import { applyToJobsParallel, batchProcess } from './parallel.js';

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

    // Initialize performance components
    this.#browserPool = getBrowserPool({
      maxBrowsers: config.maxBrowsers || 3,
      maxUsesPerBrowser: config.maxUsesPerBrowser || 50,
      logger: this.#logger,
    });

    this.#cache = getGlobalCache();
    this.#metrics = getMetrics({ logger: this.#logger });
    this.#stats = this.#initStats();

    // Start memory sampling
    this.#metrics.startSampling(10000);
  }

  #initStats() {
    return {
      searched: 0,
      filtered: 0,
      applied: 0,
      skipped: 0,
      failed: 0,
      cached: 0,
      startTime: null,
      endTime: null,
    };
  }

  /**
   * Search jobs with caching and parallel platform search
   */
  async searchJobs(keywords, options = {}) {
    this.#metrics.mark('search:start');
    this.#stats.startTime = Date.now();

    const cacheKey = `search:${keywords.join(',')}:${JSON.stringify(options)}`;

    // Check cache first
    if (this.#config.useCache) {
      const cached = this.#cache.searchResults().get(cacheKey);
      if (cached) {
        this.#metrics.increment('cache.search.hit');
        this.#stats.cached += cached.length;
        this.#logger.info(`📦 Cache hit: ${cached.length} jobs`);
        return cached;
      }
      this.#metrics.increment('cache.search.miss');
    }

    const jobs = [];
    const platforms = options.platforms || this.#config.enabledPlatforms;

    if (this.#config.parallelSearch) {
      // Parallel platform search
      const results = await Promise.allSettled(
        platforms.map(async (platform) => {
          this.#metrics.mark(`search:${platform}`);
          try {
            const result = await this.#crawler.search(platform, keywords, options);
            this.#metrics.measure(`search:${platform}`, { platform });
            return { platform, jobs: result || [] };
          } catch (error) {
            this.#metrics.measure(`search:${platform}`, {
              platform,
              success: false,
              error: error.message,
            });
            throw error;
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          jobs.push(...result.value.jobs);
          this.#metrics.increment(`search.${result.value.platform}.success`);
        } else {
          this.#logger.error('Search failed:', result.reason);
          this.#metrics.increment('search.error');
        }
      }
    } else {
      // Sequential search
      for (const platform of platforms) {
        this.#metrics.mark(`search:${platform}`);
        try {
          const result = await this.#crawler.search(platform, keywords, options);
          if (result) jobs.push(...result);
          this.#metrics.measure(`search:${platform}`, { platform, success: true });
        } catch (e) {
          this.#logger.error(`Failed to search platform ${platform}:`, e);
          this.#metrics.measure(`search:${platform}`, { platform, success: false });
        }
      }
    }

    this.#stats.searched = jobs.length;
    this.#metrics.measure('search:start', { count: jobs.length });

    // Cache results
    if (this.#config.useCache) {
      this.#cache.searchResults().set(cacheKey, jobs);
    }

    return jobs;
  }

  /**
   * Apply to jobs with parallel processing and browser pooling
   */
  async applyToJobs(jobs, dryRun = true) {
    this.#metrics.mark('apply:start');

    const results = [];
    const todayCount = this.#getTodayApplicationCount();
    const remaining = this.#config.maxDailyApplications - todayCount;

    if (remaining <= 0) {
      return {
        results: [],
        skipped: jobs.length,
        reason: 'Daily limit reached',
      };
    }

    const toApply = jobs.slice(0, remaining);

    if (dryRun) {
      // Dry run - no actual applications
      for (const job of toApply) {
        results.push({
          job,
          success: true,
          dryRun: true,
          message: 'Would apply',
        });
        this.#stats.applied++;
      }
    } else if (this.#config.parallelApply && this.#config.useBrowserPool) {
      // Parallel application with browser pool
      results.push(...(await this.#applyParallelWithPool(toApply)));
    } else if (this.#config.parallelApply) {
      // Parallel application without pool
      results.push(...(await this.#applyParallel(toApply)));
    } else {
      // Sequential application
      results.push(...(await this.#applySequential(toApply)));
    }

    this.#stats.skipped = jobs.length - toApply.length;
    this.#stats.endTime = Date.now();

    this.#metrics.measure('apply:start', {
      count: results.length,
      success: results.filter((r) => r.success).length,
    });

    return {
      results,
      applied: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      skipped: this.#stats.skipped,
    };
  }

  /**
   * Apply to jobs sequentially (original behavior)
   */
  async #applySequential(jobs) {
    const results = [];

    for (const job of jobs) {
      const result = await this.#applyToSingleJob(job);
      results.push(result);
      await this.#sleep(this.#config.delayBetweenApplies);
    }

    return results;
  }

  /**
   * Apply to jobs in parallel without browser pool
   */
  async #applyParallel(jobs) {
    return applyToJobsParallel(jobs, async (job) => this.#applyToSingleJob(job), {
      maxConcurrency: this.#config.maxConcurrentApplies,
      delayBetweenApps: this.#config.delayBetweenApplies,
      onProgress: ({ completed, total }) => {
        if (completed % 5 === 0 || completed === total) {
          this.#logger.info(`  📊 Progress: ${completed}/${total} applications`);
        }
      },
    });
  }

  /**
   * Apply to jobs in parallel with browser pool
   */
  async #applyParallelWithPool(jobs) {
    const results = [];

    await applyToJobsParallel(
      jobs,
      async (job) => {
        const pooled = await this.#browserPool.acquire();

        try {
          // Override applier's browser/page with pooled
          const originalBrowser = this.#applier.browser;
          const originalPage = this.#applier.page;

          this.#applier.browser = pooled.browser;
          this.#applier.page = pooled.page;

          const result = await this.#applier.applyToJob(job);

          // Restore original (will be null/undefined)
          this.#applier.browser = originalBrowser;
          this.#applier.page = originalPage;

          return result;
        } finally {
          await this.#browserPool.release(pooled);
        }
      },
      {
        maxConcurrency: this.#config.maxConcurrentApplies,
        delayBetweenApps: this.#config.delayBetweenApplies,
        onProgress: ({ completed, total, current, result }) => {
          const job = current;
          if (result.success) {
            this.#logger.log(`  ✅ Applied: ${job.company || job.title}`);
          } else {
            this.#logger.error(`  ❌ Failed: ${job.company || job.title} - ${result.error}`);
          }

          if (completed % 5 === 0 || completed === total) {
            this.#logger.info(`  📊 Progress: ${completed}/${total} applications`);
          }
        },
      }
    ).then((r) => results.push(...r));

    return results;
  }

  /**
   * Apply to a single job with metrics
   */
  async #applyToSingleJob(job) {
    const startTime = Date.now();
    this.#metrics.mark(`apply:job:${job.id}`);

    try {
      this.#logger.log(`  🎯 Applying to: ${job.company || job.title} (${job.source})`);

      const result = await this.#applier.applyToJob(job);
      const duration = Date.now() - startTime;

      this.#metrics.measure(`apply:job:${job.id}`, {
        source: job.source,
        success: result.success,
        duration,
      });

      this.#metrics.histogram('apply.duration', duration);

      if (result.success) {
        this.#stats.applied++;
        this.#metrics.increment('apply.success');
      } else {
        this.#stats.failed++;
        this.#metrics.increment('apply.failed');
        this.#logger.error(`❌ Apply failed for ${job.company || job.title}: ${result.error}`);
      }

      return { job, ...result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.#metrics.measure(`apply:job:${job.id}`, {
        source: job.source,
        success: false,
        error: error.message,
        duration,
      });
      this.#metrics.increment('apply.error');
      this.#stats.failed++;

      this.#logger.error(`❌ Apply exception for ${job.company || job.title}: ${error.message}`);
      return { job, success: false, error: error.message, duration };
    }
  }

  /**
   * Batch process jobs with rate limiting
   */
  async applyInBatches(jobs, options = {}) {
    const { batchSize = 10, delayBetweenBatches = 5000 } = options;

    return batchProcess(jobs, async (job) => this.#applyToSingleJob(job), {
      batchSize,
      delayBetweenBatches,
      concurrency: this.#config.maxConcurrentApplies,
      onBatchComplete: ({ batchNumber, totalBatches, completed, total }) => {
        this.#logger.info(
          `  📦 Batch ${batchNumber}/${totalBatches} complete (${completed}/${total} total)`
        );
      },
    });
  }

  /**
   * Get cached job details
   */
  async getJobDetail(jobId, fetchFn) {
    if (!this.#config.useCache) {
      return fetchFn(jobId);
    }

    const cacheKey = `job:${jobId}`;
    return this.#cache.jobs().getOrSet(cacheKey, () => fetchFn(jobId));
  }

  /**
   * Get cached company info
   */
  async getCompanyInfo(companyId, fetchFn) {
    if (!this.#config.useCache) {
      return fetchFn(companyId);
    }

    const cacheKey = `company:${companyId}`;
    return this.#cache.companies().getOrSet(cacheKey, () => fetchFn(companyId));
  }

  #getTodayApplicationCount() {
    if (!this.#appManager) return 0;

    const today = new Date().toISOString().split('T')[0];
    const apps = this.#appManager.listApplications({ fromDate: today });
    return apps.filter((a) => a.status === 'applied').length;
  }

  #sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    this.#stats = this.#initStats();
    this.#metrics.reset();
  }

  updateConfig(updates) {
    Object.assign(this.#config, updates);
  }

  /**
   * Cleanup resources
   */
  async destroy() {
    this.#metrics.stopSampling();
    await this.#browserPool.closeAll();
    this.#metrics.logSummary();
  }
}

export default OptimizedApplyOrchestrator;

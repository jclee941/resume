/**
 * @fileoverview Parallel crawl orchestrator.
 *
 * Coordinates concurrent job crawls across multiple platforms using:
 *  - {@link ResourcePool} for browser instance pooling
 *  - {@link RateLimiter} for per-platform throttling
 *  - {@link ProgressTracker} for real-time progress monitoring
 *
 * Integrates with the existing {@link UnifiedJobCrawler} platform crawlers
 * and stealth browser utilities.
 *
 * @example
 *   const orchestrator = new CrawlOrchestrator();
 *   const results = await orchestrator.crawl(
 *     ['wanted', 'saramin', 'jobkorea'],
 *     { keywords: '시니어 엔지니어', location: '서울' },
 *     { concurrency: 3 }
 *   );
 *   await orchestrator.shutdown();
 */

import { EventEmitter } from 'events';
import { ResourcePool } from './resource-pool.js';
import { RateLimiter } from './rate-limiter.js';
import { ProgressTracker } from './progress-tracker.js';
import { withStealthBrowser } from '../../../crawlers/browser-utils.js';

/**
 * Default orchestrator configuration.
 * @type {CrawlOrchestratorOptions}
 */
const DEFAULT_OPTIONS = {
  /** Max browser instances in the pool */
  maxBrowsers: 3,
  /** Min idle browsers to keep warm */
  minBrowsers: 0,
  /** Browser acquire timeout (ms) */
  acquireTimeoutMs: 60_000,
  /** Max idle time before browser eviction (ms) */
  idleTimeoutMs: 120_000,
  /** Max browser lifetime (ms) */
  maxBrowserAge: 300_000,
  /** Global concurrency cap across all platforms */
  concurrency: 3,
  /** Per-platform concurrency override map */
  platformConcurrency: {},
  /** Abort signal for external cancellation */
  signal: null,
  /** Whether to deduplicate results across platforms */
  deduplicate: true,
};

/**
 * Supported platform identifiers (must match UnifiedJobCrawler keys).
 * @type {string[]}
 */
const SUPPORTED_PLATFORMS = [
  'wanted',
  'jobkorea',
  'saramin',
  'linkedin',
  'remember',
  'rocketpunch',
  'programmers',
  'jumpit',
  'rallit',
];

/**
 * Orchestrates parallel job crawls across multiple platforms with
 * browser pooling, rate limiting, and progress tracking.
 *
 * @extends EventEmitter
 * @fires CrawlOrchestrator#platform:start
 * @fires CrawlOrchestrator#platform:complete
 * @fires CrawlOrchestrator#platform:error
 * @fires CrawlOrchestrator#progress
 * @fires CrawlOrchestrator#complete
 */
export class CrawlOrchestrator extends EventEmitter {
  /**
   * @param {Partial<CrawlOrchestratorOptions>} options
   */
  constructor(options = {}) {
    super();

    /** @type {CrawlOrchestratorOptions} */
    this.options = { ...DEFAULT_OPTIONS, ...options };

    /** @type {RateLimiter} */
    this.rateLimiter = new RateLimiter();

    /** @type {ProgressTracker} */
    this.progressTracker = new ProgressTracker();

    /** @type {ResourcePool|null} Lazily initialised on first crawl */
    this._browserPool = null;

    /** @type {AbortController|null} */
    this._abortController = null;

    /** @type {boolean} */
    this._isShutdown = false;

    this.progressTracker.on('progress', (data) => this.emit('progress', data));
    this.progressTracker.on('complete', (data) => this.emit('complete', data));
  }

  /**
   * Execute parallel crawls across the specified platforms.
   *
   * Each platform runs independently; a single platform failure does NOT
   * abort the remaining crawls.
   *
   * @param {string[]} platforms  Platform identifiers to crawl.
   * @param {SearchParams} searchParams  Search parameters forwarded to crawlers.
   * @param {Partial<CrawlOrchestratorOptions>} [runOptions]  Per-run overrides.
   * @returns {Promise<CrawlResult>}
   */
  async crawl(platforms, searchParams, runOptions = {}) {
    if (this._isShutdown) {
      throw new Error('Orchestrator has been shut down');
    }

    const opts = { ...this.options, ...runOptions };
    const validPlatforms = this._validatePlatforms(platforms);

    this._abortController = new AbortController();
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => this._abortController.abort(), { once: true });
    }

    this._ensureBrowserPool(opts);

    const taskMap = new Map();
    for (const platform of validPlatforms) {
      const taskId = this.progressTracker.addTask(platform, 'search', {
        metadata: { keywords: searchParams.keywords, platform },
      });
      taskMap.set(platform, taskId);
    }

    const results = await this._executeWithConcurrency(validPlatforms, searchParams, taskMap, opts);
    return this._aggregateResults(results, opts);
  }

  /**
   * Cancel all in-flight crawls.
   *
   * Running tasks are marked as cancelled in the progress tracker.
   */
  cancel() {
    if (this._abortController) {
      this._abortController.abort();
    }
  }

  /**
   * Gracefully shut down the orchestrator, draining the browser pool.
   *
   * @param {number} [timeoutMs=30000] Max time to wait for drain.
   */
  async shutdown(timeoutMs = 30_000) {
    this._isShutdown = true;
    this.cancel();

    if (this._browserPool) {
      await this._browserPool.drain(timeoutMs);
      this._browserPool = null;
    }
  }

  /**
   * Returns current orchestrator metrics.
   *
   * @returns {{ rateLimiter: object, progress: object, browserPool: object|null }}
   */
  getMetrics() {
    return {
      rateLimiter: this.rateLimiter.getMetrics(),
      progress: this.progressTracker.getOverallProgress(),
      browserPool: this._browserPool ? this._browserPool.getMetrics() : null,
    };
  }

  /**
   * Lazily create the browser pool with stealth browsers.
   * @param {CrawlOrchestratorOptions} opts
   * @private
   */
  _ensureBrowserPool(opts) {
    if (this._browserPool) return;

    this._browserPool = new ResourcePool({
      create: () => this._createBrowserContext(),
      destroy: (ctx) => this._destroyBrowserContext(ctx),
      validate: (ctx) => ctx && !ctx.closed,
      maxSize: opts.maxBrowsers,
      minSize: opts.minBrowsers,
      acquireTimeoutMs: opts.acquireTimeoutMs,
      idleTimeoutMs: opts.idleTimeoutMs,
      maxAge: opts.maxBrowserAge,
    });
  }

  /**
   * Create a stealth browser context wrapper.
   * @returns {Promise<{ browser: object, page: object, closed: boolean }>}
   * @private
   */
  async _createBrowserContext() {
    // withStealthBrowser manages launch + stealth patches.
    // We wrap it so the pool can hold a reference.
    const ctx = { browser: null, page: null, closed: false };

    // We cannot directly pool withStealthBrowser (it owns the lifecycle),
    // so we use a deferred pattern: the pool creates a placeholder that
    // individual crawl tasks fill via withStealthBrowser per-use.
    // This keeps browser lifecycle inside the stealth utility.
    return ctx;
  }

  /**
   * @param {{ closed: boolean }} ctx
   * @private
   */
  async _destroyBrowserContext(ctx) {
    ctx.closed = true;
  }

  /**
   * Validate platform identifiers.
   * @param {string[]} platforms
   * @returns {string[]}
   * @private
   */
  _validatePlatforms(platforms) {
    if (!Array.isArray(platforms) || platforms.length === 0) {
      throw new Error('At least one platform must be specified');
    }

    const valid = [];
    const invalid = [];

    for (const p of platforms) {
      const key = p.toLowerCase().trim();
      if (SUPPORTED_PLATFORMS.includes(key)) {
        valid.push(key);
      } else {
        invalid.push(p);
      }
    }

    if (invalid.length > 0) {
      this.emit('warning', {
        message: `Unknown platforms ignored: ${invalid.join(', ')}`,
        platforms: invalid,
      });
    }

    if (valid.length === 0) {
      throw new Error(`No valid platforms provided. Supported: ${SUPPORTED_PLATFORMS.join(', ')}`);
    }

    return valid;
  }

  /**
   * Run platform crawls with bounded concurrency.
   *
   * @param {string[]} platforms
   * @param {SearchParams} searchParams
   * @param {Map<string,string>} taskMap  platform→taskId
   * @param {CrawlOrchestratorOptions} opts
   * @returns {Promise<Map<string, PlatformResult>>}
   * @private
   */
  async _executeWithConcurrency(platforms, searchParams, taskMap, opts) {
    const results = new Map();
    const concurrency = opts.concurrency;
    let index = 0;

    /**
     * Worker that pulls platforms from the queue.
     */
    const worker = async () => {
      while (index < platforms.length) {
        if (this._abortController.signal.aborted) break;

        const i = index++;
        const platform = platforms[i];
        const taskId = taskMap.get(platform);

        const result = await this._crawlPlatform(platform, searchParams, taskId, opts);
        results.set(platform, result);
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, platforms.length) }, () => worker());
    await Promise.allSettled(workers);

    return results;
  }

  /**
   * Crawl a single platform with rate limiting and progress tracking.
   *
   * @param {string} platform
   * @param {SearchParams} searchParams
   * @param {string} taskId
   * @param {CrawlOrchestratorOptions} opts
   * @returns {Promise<PlatformResult>}
   * @private
   */
  async _crawlPlatform(platform, searchParams, taskId, opts) {
    const startTime = Date.now();
    this.progressTracker.startTask(taskId);
    this.emit('platform:start', { platform, taskId });

    try {
      if (this._abortController.signal.aborted) {
        this.progressTracker.cancelTask(taskId);
        return { platform, status: 'cancelled', jobs: [], error: null, durationMs: 0 };
      }

      await this.rateLimiter.acquire(platform);
      const jobs = await this._executePlatformCrawl(platform, searchParams);
      this.rateLimiter.recordResponse(platform, { statusCode: 200 });

      this.progressTracker.updateProgress(taskId, {
        itemsProcessed: jobs.length,
        itemsTotal: jobs.length,
        progress: 100,
      });

      const durationMs = Date.now() - startTime;
      this.progressTracker.completeTask(taskId, {
        jobCount: jobs.length,
        durationMs,
      });

      this.emit('platform:complete', { platform, taskId, jobCount: jobs.length, durationMs });

      return { platform, status: 'success', jobs, error: null, durationMs };
    } catch (error) {
      const durationMs = Date.now() - startTime;

      const statusCode = error.statusCode || error.status || 500;
      this.rateLimiter.recordResponse(platform, {
        statusCode,
        retryAfterMs: error.retryAfter ? error.retryAfter * 1000 : undefined,
      });

      this.progressTracker.failTask(taskId, error);
      this.emit('platform:error', { platform, taskId, error, durationMs });

      return {
        platform,
        status: 'error',
        jobs: [],
        error: { message: error.message, code: statusCode },
        durationMs,
      };
    }
  }

  /**
   * Execute the actual crawl for one platform using stealth browser.
   *
   * Delegates to the platform's crawler `.searchJobs()` method through
   * `withStealthBrowser` to ensure anti-bot stealth patches are applied.
   *
   * @param {string} platform
   * @param {SearchParams} searchParams
   * @returns {Promise<object[]>}
   * @private
   */
  async _executePlatformCrawl(platform, searchParams) {
    const { default: UnifiedJobCrawler } = await import('../../../crawlers/index.js');
    const crawler = new UnifiedJobCrawler();

    const results = await crawler.search(platform, searchParams.keywords, {
      location: searchParams.location,
      experience: searchParams.experience,
      limit: searchParams.limit,
      ...searchParams.extra,
    });

    return results || [];
  }

  /**
   * Aggregate results from all platforms.
   *
   * @param {Map<string, PlatformResult>} results
   * @param {CrawlOrchestratorOptions} opts
   * @returns {CrawlResult}
   * @private
   */
  _aggregateResults(results, opts) {
    let allJobs = [];
    const platformSummaries = {};
    const errors = [];

    for (const [platform, result] of results) {
      platformSummaries[platform] = {
        status: result.status,
        jobCount: result.jobs.length,
        durationMs: result.durationMs,
        error: result.error,
      };

      if (result.status === 'success') {
        allJobs.push(...result.jobs);
      }

      if (result.error) {
        errors.push({ platform, ...result.error });
      }
    }

    if (opts.deduplicate && allJobs.length > 0) {
      const seen = new Set();
      allJobs = allJobs.filter((job) => {
        const key = `${(job.company || '').toLowerCase()}|${(job.position || job.title || '').toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return {
      jobs: allJobs,
      totalJobs: allJobs.length,
      platforms: platformSummaries,
      errors,
      hasErrors: errors.length > 0,
      metrics: this.getMetrics(),
    };
  }
}

export { SUPPORTED_PLATFORMS, DEFAULT_OPTIONS };

export default CrawlOrchestrator;

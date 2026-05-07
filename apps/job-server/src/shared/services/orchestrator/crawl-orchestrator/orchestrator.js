/**
 * @fileoverview Parallel crawl orchestrator class.
 */

import { EventEmitter } from 'events';
import { RateLimiter } from '@resume/shared/rate-limit';
import { ProgressTracker } from '../progress-tracker.js';
import { createBrowserContext, destroyBrowserContext, ensureBrowserPool } from './browser-pool.js';
import { DEFAULT_OPTIONS } from './constants.js';
import { crawlPlatform, executePlatformCrawl, executeWithConcurrency } from './platform-crawl.js';
import { validatePlatforms } from './platform-validation.js';
import { aggregateResults } from './result-aggregation.js';

/**
 * Orchestrates parallel job crawls across multiple platforms with browser
 * pooling, rate limiting, and progress tracking.
 *
 * @extends EventEmitter
 */
export class CrawlOrchestrator extends EventEmitter {
  /**
   * @param {Partial<CrawlOrchestratorOptions>} options
   */
  constructor(options = {}) {
    super();
    this.setMaxListeners(20);

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
   * Each platform runs independently; a single platform failure does not abort
   * the remaining crawls.
   *
   * @param {string[]} platforms Platform identifiers to crawl.
   * @param {SearchParams} searchParams Search parameters forwarded to crawlers.
   * @param {Partial<CrawlOrchestratorOptions>} [runOptions] Per-run overrides.
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

    const taskMap = this._createTaskMap(validPlatforms, searchParams);
    const results = await this._executeWithConcurrency(validPlatforms, searchParams, taskMap, opts);
    return this._aggregateResults(results, opts);
  }

  /** Cancel all in-flight crawls. */
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

    this.progressTracker?.destroy();
    this.removeAllListeners();
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
   * @param {CrawlOrchestratorOptions} opts
   * @private
   */
  _ensureBrowserPool(opts) {
    ensureBrowserPool(this, opts);
  }

  /**
   * @returns {Promise<{ browser: object|null, page: object|null, closed: boolean }>}
   * @private
   */
  async _createBrowserContext() {
    return createBrowserContext();
  }

  /**
   * @param {{ closed: boolean }} ctx
   * @private
   */
  async _destroyBrowserContext(ctx) {
    return destroyBrowserContext(ctx);
  }

  /**
   * @param {string[]} platforms
   * @returns {string[]}
   * @private
   */
  _validatePlatforms(platforms) {
    return validatePlatforms(platforms, this);
  }

  /**
   * @param {string[]} platforms
   * @param {SearchParams} searchParams
   * @returns {Map<string,string>}
   * @private
   */
  _createTaskMap(platforms, searchParams) {
    const taskMap = new Map();
    for (const platform of platforms) {
      const taskId = this.progressTracker.addTask(platform, 'search', {
        metadata: { keywords: searchParams.keywords, platform },
      });
      taskMap.set(platform, taskId);
    }
    return taskMap;
  }

  /**
   * @param {string[]} platforms
   * @param {SearchParams} searchParams
   * @param {Map<string,string>} taskMap
   * @param {CrawlOrchestratorOptions} opts
   * @returns {Promise<Map<string, PlatformResult>>}
   * @private
   */
  async _executeWithConcurrency(platforms, searchParams, taskMap, opts) {
    return executeWithConcurrency(this, platforms, searchParams, taskMap, opts);
  }

  /**
   * @param {string} platform
   * @param {SearchParams} searchParams
   * @param {string} taskId
   * @returns {Promise<PlatformResult>}
   * @private
   */
  async _crawlPlatform(platform, searchParams, taskId) {
    return crawlPlatform(this, platform, searchParams, taskId);
  }

  /**
   * @param {string} platform
   * @param {SearchParams} searchParams
   * @returns {Promise<object[]>}
   * @private
   */
  async _executePlatformCrawl(platform, searchParams) {
    return executePlatformCrawl(platform, searchParams);
  }

  /**
   * @param {Map<string, PlatformResult>} results
   * @param {CrawlOrchestratorOptions} opts
   * @returns {CrawlResult}
   * @private
   */
  _aggregateResults(results, opts) {
    return aggregateResults(results, opts, this.getMetrics());
  }
}

export default CrawlOrchestrator;

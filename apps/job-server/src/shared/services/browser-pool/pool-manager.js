/** Browser Pool - Reusable browser instance management. */

import { EventEmitter } from 'events';
import { createBrowser, closeBrowser, isHealthy, resetPageState } from './browser-lifecycle.js';
import {
  createPoolMetrics,
  getMemoryEstimate,
  getPoolMetrics,
  recordQueueWait,
} from './resource-tracking.js';

/**
 * @typedef {import('./browser-lifecycle.js').BrowserPoolEntry} BrowserPoolEntry
 * @typedef {{ resolve: (browser: BrowserPoolEntry) => void, reject: (error: Error) => void, rotateUA: boolean }} BrowserQueueEntry
 * @typedef {{ maxBrowsers?: number, maxUsesPerBrowser?: number, idleTimeoutMs?: number, logger?: { debug: (message: string, ...args: unknown[]) => void } }} BrowserPoolOptions
 */

export class BrowserPool extends EventEmitter {
  /** @type {Map<string, BrowserPoolEntry>} */
  #pool = new Map();
  /** @type {BrowserQueueEntry[]} */
  #queue = [];
  #maxBrowsers;
  #maxUsesPerBrowser;
  #idleTimeoutMs;
  #cleanupInterval;
  #logger;
  #metrics = createPoolMetrics();

  /** @param {BrowserPoolOptions} [options] */
  constructor(options = {}) {
    super();
    this.#maxBrowsers = options.maxBrowsers || 3;
    this.#maxUsesPerBrowser = options.maxUsesPerBrowser || 50;
    this.#idleTimeoutMs = options.idleTimeoutMs || 300000;
    this.#logger = options.logger || console;

    this.#cleanupInterval = setInterval(() => this.#cleanupIdleBrowsers(), 60000);
    this.#cleanupInterval.unref?.();
  }

  /**
   * @param {{ rotateUA?: boolean }} [options]
   * @returns {Promise<BrowserPoolEntry>}
   */
  async acquire(options = {}) {
    const startTime = Date.now();
    const { rotateUA = true } = options;
    const available = this.#findAvailableBrowser();

    if (available) {
      return this.#markAcquired(available, true);
    }

    if (this.#pool.size < this.#maxBrowsers) {
      const browser = await this.#createBrowser(rotateUA);
      this.#metrics.created++;
      this.emit('acquired', { browserId: browser.id, reused: false });
      return browser;
    }

    this.#metrics.queueWaits++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.#queue.findIndex((item) => item.resolve === resolve);
        if (index > -1) this.#queue.splice(index, 1);
        reject(new Error('Browser acquisition timeout'));
      }, 30000);

      this.#queue.push({
        resolve: (browser) => {
          clearTimeout(timeout);
          recordQueueWait(this.#metrics, Date.now() - startTime);
          resolve(browser);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        rotateUA,
      });

      this.emit('queued', { queueLength: this.#queue.length });
    });
  }

  /** @param {BrowserPoolEntry | null | undefined} pooledBrowser */
  async release(pooledBrowser) {
    if (!pooledBrowser || !this.#pool.has(pooledBrowser.id)) return;

    const entry = /** @type {BrowserPoolEntry} */ (this.#pool.get(pooledBrowser.id));
    if (entry.useCount >= this.#maxUsesPerBrowser || !(await isHealthy(entry))) {
      await this.#closeBrowser(entry);
      this.#processQueue();
      return;
    }

    await resetPageState(entry, this.#logger);
    entry.inUse = false;
    entry.lastUsedAt = new Date();
    this.#metrics.released++;
    this.emit('released', { browserId: entry.id });
    this.#processQueue();
  }

  async closeAll() {
    clearInterval(this.#cleanupInterval);

    while (this.#queue.length > 0) {
      const { reject } = /** @type {BrowserQueueEntry} */ (this.#queue.shift());
      reject(new Error('Pool closing'));
    }

    const closePromises = Array.from(this.#pool.values()).map((entry) =>
      this.#closeBrowser(entry).catch(() => {})
    );
    await Promise.all(closePromises);
    this.#pool.clear();
    this.emit('closed');
  }

  getMetrics() {
    return getPoolMetrics(this.#metrics, this.#pool, this.#queue);
  }

  getMemoryEstimate() {
    return getMemoryEstimate(this.#pool);
  }

  #findAvailableBrowser() {
    for (const entry of this.#pool.values()) {
      if (!entry.inUse && entry.useCount < this.#maxUsesPerBrowser) return entry;
    }
    return null;
  }

  async #createBrowser(rotateUA = true) {
    return createBrowser({
      pool: this.#pool,
      rotateUA,
      onDisconnected: (id) => {
        this.#pool.delete(id);
        this.#processQueue();
      },
    });
  }

  /** @param {BrowserPoolEntry} entry */
  async #closeBrowser(entry) {
    await closeBrowser({
      entry,
      pool: this.#pool,
      metrics: this.#metrics,
      emit: this.emit.bind(this),
      logger: this.#logger,
    });
  }

  /**
   * @param {BrowserPoolEntry} entry
   * @param {boolean} reused
   */
  #markAcquired(entry, reused) {
    entry.inUse = true;
    entry.useCount++;
    entry.lastUsedAt = new Date();
    if (reused) this.#metrics.reused++;
    this.emit('acquired', { browserId: entry.id, reused });
    return entry;
  }

  #processQueue() {
    if (this.#queue.length === 0) return;

    const available = this.#findAvailableBrowser();
    if (available) {
      const { resolve } = /** @type {BrowserQueueEntry} */ (this.#queue.shift());
      resolve(this.#markAcquired(available, true));
      return;
    }

    if (this.#pool.size < this.#maxBrowsers) {
      const { resolve, rotateUA, reject } = /** @type {BrowserQueueEntry} */ (this.#queue.shift());
      this.#createBrowser(rotateUA)
        .then((browser) => {
          this.#metrics.created++;
          this.emit('acquired', { browserId: browser.id, reused: false });
          resolve(browser);
        })
        .catch(reject);
    }
  }

  async #cleanupIdleBrowsers() {
    const now = Date.now();
    const toClose = [];

    for (const entry of this.#pool.values()) {
      if (!entry.inUse && now - entry.lastUsedAt.getTime() > this.#idleTimeoutMs) {
        toClose.push(entry);
      }
    }

    for (const entry of toClose) {
      await this.#closeBrowser(entry);
      this.#logger.debug(`Cleaned up idle browser: ${entry.id}`);
    }

    if (toClose.length > 0) this.#processQueue();
  }
}

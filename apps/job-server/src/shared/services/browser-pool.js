/**
 * Browser Pool - Reusable browser instance management
 *
 * Provides connection pooling for Puppeteer browsers to reduce
 * launch overhead and memory usage across multiple job applications.
 */

import { generateFingerprint, applyStealthPatches } from '@resume/shared/browser/stealth';
import { EventEmitter } from 'events';

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-features=TranslateUI',
  '--disable-extensions',
  '--no-first-run',
  '--window-size=1920,1080',
];

/**
 * Pooled browser instance with metadata
 * @typedef {Object} PooledBrowser
 * @property {import('puppeteer').Browser} browser
 * @property {import('puppeteer').Page} page
 * @property {string} id
 * @property {boolean} inUse
 * @property {Date} createdAt
 * @property {Date} lastUsedAt
 * @property {number} useCount
 * @property {string} userAgent
 */

export class BrowserPool extends EventEmitter {
  #pool = new Map();
  #queue = [];
  #maxBrowsers;
  #maxUsesPerBrowser;
  #idleTimeoutMs;
  #cleanupInterval;
  #logger;
  #metrics = {
    created: 0,
    reused: 0,
    released: 0,
    closed: 0,
    queueWaits: 0,
    avgWaitTimeMs: 0,
    totalWaitTimeMs: 0,
  };

  /**
   * @param {Object} options
   * @param {number} [options.maxBrowsers=3] - Maximum concurrent browsers
   * @param {number} [options.maxUsesPerBrowser=50] - Max uses before recycling
   * @param {number} [options.idleTimeoutMs=300000] - Idle timeout (5 min)
   * @param {Object} [options.logger] - Logger instance
   */
  constructor(options = {}) {
    super();
    this.#maxBrowsers = options.maxBrowsers || 3;
    this.#maxUsesPerBrowser = options.maxUsesPerBrowser || 50;
    this.#idleTimeoutMs = options.idleTimeoutMs || 300000;
    this.#logger = options.logger || console;

    // Start cleanup interval
    // Start cleanup interval. .unref() so Node can exit when nothing else
    // keeps the event loop alive (e.g. when tests create pool instances but
    // never call acquire() - would otherwise hang node --test for 60s+).
    this.#cleanupInterval = setInterval(() => this.#cleanupIdleBrowsers(), 60000);
    this.#cleanupInterval.unref?.();
  }

  /**
   * Acquire a browser from the pool
   * @param {Object} options
   * @param {boolean} [options.rotateUA=true] - Rotate User-Agent
   * @returns {Promise<PooledBrowser>}
   */
  async acquire(options = {}) {
    const startTime = Date.now();
    const { rotateUA = true } = options;

    // Try to find available browser
    const available = this.#findAvailableBrowser();
    if (available) {
      available.inUse = true;
      available.useCount++;
      available.lastUsedAt = new Date();
      this.#metrics.reused++;
      this.emit('acquired', { browserId: available.id, reused: true });
      return available;
    }

    // Create new browser if under limit
    if (this.#pool.size < this.#maxBrowsers) {
      const browser = await this.#createBrowser(rotateUA);
      this.#metrics.created++;
      this.emit('acquired', { browserId: browser.id, reused: false });
      return browser;
    }

    // Queue and wait
    this.#metrics.queueWaits++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.#queue.findIndex((item) => item.resolve === resolve);
        if (index > -1) {
          this.#queue.splice(index, 1);
        }
        reject(new Error('Browser acquisition timeout'));
      }, 30000);

      this.#queue.push({
        resolve: (browser) => {
          clearTimeout(timeout);
          const waitTime = Date.now() - startTime;
          this.#metrics.totalWaitTimeMs += waitTime;
          this.#metrics.avgWaitTimeMs = this.#metrics.totalWaitTimeMs / this.#metrics.queueWaits;
          resolve(browser);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
        rotateUA,
      });

      this.emit('queued', { queueLength: this.#queue.length });
    });
  }

  /**
   * Release a browser back to the pool
   * @param {PooledBrowser} pooledBrowser
   */
  async release(pooledBrowser) {
    if (!pooledBrowser || !this.#pool.has(pooledBrowser.id)) {
      return;
    }

    const entry = this.#pool.get(pooledBrowser.id);

    // Check if browser needs recycling
    if (entry.useCount >= this.#maxUsesPerBrowser || !(await this.#isHealthy(entry))) {
      await this.#closeBrowser(entry);
      this.#processQueue();
      return;
    }

    // Clear page state
    try {
      await entry.page.deleteCookie(...(await entry.page.cookies()));
      await entry.page.goto('about:blank');
    } catch (e) {
      this.#logger.debug('Failed to clear page state:', e.message);
    }

    entry.inUse = false;
    entry.lastUsedAt = new Date();
    this.#metrics.released++;
    this.emit('released', { browserId: entry.id });

    // Process queue
    this.#processQueue();
  }

  /**
   * Close all browsers in the pool
   */
  async closeAll() {
    clearInterval(this.#cleanupInterval);

    // Reject pending queue
    while (this.#queue.length > 0) {
      const { reject } = this.#queue.shift();
      reject(new Error('Pool closing'));
    }

    // Close all browsers
    const closePromises = Array.from(this.#pool.values()).map((entry) =>
      this.#closeBrowser(entry).catch(() => {})
    );

    await Promise.all(closePromises);
    this.#pool.clear();
    this.emit('closed');
  }

  /**
   * Get pool metrics
   * @returns {Object}
   */
  getMetrics() {
    return {
      ...this.#metrics,
      poolSize: this.#pool.size,
      inUse: Array.from(this.#pool.values()).filter((b) => b.inUse).length,
      available: Array.from(this.#pool.values()).filter((b) => !b.inUse).length,
      queueLength: this.#queue.length,
    };
  }

  /**
   * Get memory usage estimate
   * @returns {number} Estimated MB
   */
  getMemoryEstimate() {
    // Rough estimate: ~100MB per browser instance
    return this.#pool.size * 100;
  }

  /**
   * Find an available browser in the pool
   * @returns {PooledBrowser|null}
   */
  #findAvailableBrowser() {
    for (const entry of this.#pool.values()) {
      if (!entry.inUse && entry.useCount < this.#maxUsesPerBrowser) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Create a new browser instance
   * @param {boolean} rotateUA
   * @returns {Promise<PooledBrowser>}
   */
  async #createBrowser(rotateUA = true) {
    const puppeteer = await import('puppeteer').then((m) => m.default);

    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: LAUNCH_ARGS,
    });

    const page = await browser.newPage();
    const fingerprint = generateFingerprint();
    await applyStealthPatches(page, rotateUA ? fingerprint : undefined);

    const id = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const entry = {
      browser,
      page,
      id,
      inUse: true,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 1,
      userAgent: fingerprint.ua,
    };

    this.#pool.set(id, entry);

    // Handle browser disconnection
    browser.on('disconnected', () => {
      this.#pool.delete(id);
      this.#processQueue();
    });

    return entry;
  }

  /**
   * Close a browser instance
   * @param {PooledBrowser} entry
   */
  async #closeBrowser(entry) {
    this.#pool.delete(entry.id);

    try {
      await entry.browser.close();
      this.#metrics.closed++;
      this.emit('closed:browser', { browserId: entry.id });
    } catch (e) {
      this.#logger.debug('Error closing browser:', e.message);
    }
  }

  /**
   * Check if browser is healthy
   * @param {PooledBrowser} entry
   * @returns {Promise<boolean>}
   */
  async #isHealthy(entry) {
    try {
      // Check if browser is connected
      if (!entry.browser.isConnected()) {
        return false;
      }

      // Test page responsiveness
      await entry.page.evaluate(() => true);
      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * Process waiting queue
   */
  #processQueue() {
    if (this.#queue.length === 0) return;

    const available = this.#findAvailableBrowser();
    if (available) {
      const { resolve } = this.#queue.shift();
      available.inUse = true;
      available.useCount++;
      available.lastUsedAt = new Date();
      this.#metrics.reused++;
      this.emit('acquired', { browserId: available.id, reused: true });
      resolve(available);
      return;
    }

    // Create new if under limit
    if (this.#pool.size < this.#maxBrowsers) {
      const { resolve, rotateUA, reject } = this.#queue.shift();
      this.#createBrowser(rotateUA)
        .then((browser) => {
          this.#metrics.created++;
          this.emit('acquired', { browserId: browser.id, reused: false });
          resolve(browser);
        })
        .catch(reject);
    }
  }

  /**
   * Cleanup idle browsers
   */
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

    if (toClose.length > 0) {
      this.#processQueue();
    }
  }
}

// Singleton instance for application-wide use
let globalPool = null;

/**
 * Get or create global browser pool
 * @param {Object} options
 * @returns {BrowserPool}
 */
export function getBrowserPool(options = {}) {
  if (!globalPool) {
    globalPool = new BrowserPool(options);
  }
  return globalPool;
}

/**
 * Reset global browser pool (for testing)
 */
export function resetBrowserPool() {
  if (globalPool) {
    globalPool.closeAll().catch(() => {});
    globalPool = null;
  }
}

export default BrowserPool;

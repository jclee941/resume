/**
 * @fileoverview Browser pool lifecycle helpers for crawl orchestration.
 */

import { ResourcePool } from '../resource-pool/resource-pool.js';

/**
 * @typedef {object} PooledBrowserContext
 * @property {unknown} browser
 * @property {unknown} page
 * @property {boolean} closed
 */

/**
 * @typedef {object} BrowserPoolOrchestrator
 * @property {ResourcePool<PooledBrowserContext> | null} [_browserPool]
 * @property {() => Promise<PooledBrowserContext>} _createBrowserContext
 * @property {(ctx: PooledBrowserContext) => Promise<void>} _destroyBrowserContext
 */

/**
 * @typedef {typeof ResourcePool & {
 *   new (options: {
 *     create: () => Promise<PooledBrowserContext>;
 *     destroy: (ctx: PooledBrowserContext) => Promise<void>;
 *     validate: (ctx: PooledBrowserContext) => boolean;
 *     maxSize?: number;
 *     minSize?: number;
 *     acquireTimeoutMs?: number;
 *     idleTimeoutMs?: number;
 *     maxAge?: number;
 *   }): ResourcePool<PooledBrowserContext>;
 * }} BrowserResourcePoolConstructor
 */

/**
 * Lazily create the browser pool with stealth-browser-compatible placeholders.
 *
 * @param {BrowserPoolOrchestrator} orchestrator
 * @param {import('./constants.js').CrawlOrchestratorOptions} opts
 */
export function ensureBrowserPool(orchestrator, opts) {
  if (orchestrator._browserPool) return;

  orchestrator._browserPool = new /** @type {BrowserResourcePoolConstructor} */ (ResourcePool)({
    create: () => orchestrator._createBrowserContext(),
    destroy: (ctx) => orchestrator._destroyBrowserContext(ctx),
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
 *
 * withStealthBrowser manages launch + stealth patches. The pool stores a
 * placeholder that individual crawl tasks can fill per use, keeping lifecycle
 * ownership inside the stealth utility.
 *
 * @returns {Promise<PooledBrowserContext>}
 */
export async function createBrowserContext() {
  return { browser: null, page: null, closed: false };
}

/**
 * Mark a pooled browser context as closed.
 *
 * @param {PooledBrowserContext} ctx
 * @returns {Promise<void>}
 */
export async function destroyBrowserContext(ctx) {
  ctx.closed = true;
}

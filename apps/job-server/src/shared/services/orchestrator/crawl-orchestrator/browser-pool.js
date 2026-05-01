/**
 * @fileoverview Browser pool lifecycle helpers for crawl orchestration.
 */

import { ResourcePool } from '../resource-pool/resource-pool.js';

/**
 * Lazily create the browser pool with stealth-browser-compatible placeholders.
 *
 * @param {object} orchestrator
 * @param {CrawlOrchestratorOptions} opts
 */
export function ensureBrowserPool(orchestrator, opts) {
  if (orchestrator._browserPool) return;

  orchestrator._browserPool = new ResourcePool({
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
 * @returns {Promise<{ browser: object|null, page: object|null, closed: boolean }>}
 */
export async function createBrowserContext() {
  return { browser: null, page: null, closed: false };
}

/**
 * Mark a pooled browser context as closed.
 *
 * @param {{ closed: boolean }} ctx
 */
export async function destroyBrowserContext(ctx) {
  ctx.closed = true;
}

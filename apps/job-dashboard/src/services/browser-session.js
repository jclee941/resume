/**
 * @fileoverview Caller-side helper for borrowing a Cloudflare Browser
 * Rendering session from the `BrowserSessionDO` pool (CF-native migration,
 * Wave 2). NOT wired into any crawler, route, queue, or scheduled handler
 * yet — this is a drop-in for future callers, added in Wave 3 once live
 * Browser Rendering behaviour has been validated.
 *
 * @module services/browser-session
 */

import puppeteerDefault from '@cloudflare/puppeteer';

/**
 * @typedef {{
 *   fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
 * }} DurableObjectStub
 *
 * @typedef {{
 *   idFromName(name: string): unknown;
 *   get(id: unknown): DurableObjectStub;
 * }} DurableObjectNamespaceBinding
 */

/**
 * Run `fn` with a connected Browser Rendering session borrowed from the
 * `BROWSER_SESSION` Durable Object pool, releasing it when done regardless
 * of success or failure. A reused session that refuses the connection is
 * replaced by a freshly launched one.
 *
 * @template T
 * @param {{BROWSER_SESSION: DurableObjectNamespaceBinding, MYBROWSER: import('@cloudflare/puppeteer').ConnectOptions | import('@cloudflare/puppeteer').BrowserWorker}} env
 * @param {(browser: import('@cloudflare/puppeteer').Browser) => Promise<T>} fn
 * @param {{puppeteer?: {connect: (endpoint: import('@cloudflare/puppeteer').ConnectOptions | import('@cloudflare/puppeteer').BrowserWorker, sessionId?: string) => Promise<import('@cloudflare/puppeteer').Browser>}, name?: string}} [opts]
 * @returns {Promise<T>}
 */
export async function withBrowserSession(env, fn, opts = {}) {
  const { puppeteer = puppeteerDefault, name = 'global' } = opts;

  const stub = env.BROWSER_SESSION.get(env.BROWSER_SESSION.idFromName(name));
  let { sessionId, reused } = await acquire(stub, {});
  /** @type {import('@cloudflare/puppeteer').Browser | undefined} */
  let browser;

  try {
    try {
      browser = await puppeteer.connect(env.MYBROWSER, sessionId);
    } catch (error) {
      if (!reused) throw error;
      // A pooled session listed as free can still refuse the connection while its last user is
      // letting go or it is closing, so it is handed back and a fresh session is launched once.
      await release(stub, sessionId);
      ({ sessionId, reused } = await acquire(stub, { fresh: true }));
      browser = await puppeteer.connect(env.MYBROWSER, sessionId);
    }
    return await fn(browser);
  } finally {
    try {
      if (browser) await browser.disconnect();
    } catch {
      // best-effort — the session may already be disconnected
    }
    await release(stub, sessionId);
  }
}

/**
 * @param {DurableObjectStub} stub
 * @param {{ fresh?: boolean }} body `fresh` skips reuse and launches a new session
 * @returns {Promise<{ sessionId: string; reused?: boolean }>}
 */
async function acquire(stub, body) {
  const acquireResponse = await stub.fetch('https://browser-session/acquire', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const acquired = await acquireResponse.json();

  if (!acquired || !acquired.sessionId) {
    /** @type {Error & { code?: string }} */
    const err = new Error(acquired?.error || 'Failed to acquire browser session');
    if (acquired?.code) err.code = acquired.code;
    throw err;
  }
  return acquired;
}

/**
 * @param {DurableObjectStub} stub
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
async function release(stub, sessionId) {
  try {
    await stub.fetch('https://browser-session/release', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    // best-effort — release failures should not mask fn's result/error
  }
}

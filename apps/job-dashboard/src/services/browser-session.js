/**
 * @fileoverview Caller-side helper for borrowing a Cloudflare Browser Rendering session from the
 * `BrowserSessionDO` pool and handing it back afterwards. Every dashboard Browser Rendering caller
 * goes through it: the JobKorea session refresh (handlers/jobkorea/mint-session.js), the JobKorea
 * resume editor (services/resume-platform-sync/jobkorea-editor.js), the JobKorea application-history
 * adapter (services/application-history/jobkorea-adapter.js) and the admin smoke probe
 * (handlers/browser/smoke.js).
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
 * @param {{puppeteer?: {connect: (endpoint: import('@cloudflare/puppeteer').ConnectOptions | import('@cloudflare/puppeteer').BrowserWorker, sessionId?: string) => Promise<import('@cloudflare/puppeteer').Browser>}, name?: string, assertOpen?: (next: string) => void}} [opts]
 *   `assertOpen(next)` throws once the caller's deadline has passed. It runs after every awaited
 *   acquisition or hand-back, before the next connection or launch, so a session acquired too
 *   late is handed back unconnected and no fresh session is launched after the deadline.
 * @returns {Promise<T>}
 */
export async function withBrowserSession(env, fn, opts = {}) {
  const { puppeteer = puppeteerDefault, name = 'global', assertOpen = () => {} } = opts;

  const stub = env.BROWSER_SESSION.get(env.BROWSER_SESSION.idFromName(name));
  let { sessionId, reused } = await acquire(stub, {});
  /** @type {string | null} the session this call still holds and must hand back */
  let held = sessionId;
  /** @type {import('@cloudflare/puppeteer').Browser | undefined} */
  let browser;

  try {
    assertOpen('the browser connected');
    try {
      browser = await puppeteer.connect(env.MYBROWSER, sessionId);
    } catch (error) {
      if (!reused) throw error;
      // A pooled session listed as free can still refuse the connection while its last user is
      // letting go or it is closing, so it is handed back and a fresh session is launched once.
      await release(stub, sessionId);
      held = null;
      assertOpen('a fresh browser was launched');
      ({ sessionId, reused } = await acquire(stub, { fresh: true }));
      held = sessionId;
      assertOpen('the fresh browser connected');
      browser = await puppeteer.connect(env.MYBROWSER, sessionId);
    }
    return await fn(browser);
  } finally {
    try {
      if (browser) await browser.disconnect();
    } catch {
      // best-effort — the session may already be disconnected
    }
    // A handed-back session may already belong to another borrower, so only a held one is released.
    if (held) await release(stub, held);
  }
}

/**
 * Waits for a page or browser call that a stalled page can leave pending, at most `ms`.
 * @template T
 * @param {Promise<T>} work
 * @param {number} ms
 * @returns {Promise<T | null>} the result, or null when it failed or did not settle within `ms`
 */
export async function settleWithin(work, ms) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  /** @type {Promise<null>} */
  const gaveUp = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([work.catch(() => null), gaveUp]);
  } finally {
    clearTimeout(timer);
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

/**
 * @fileoverview Caller-side helper for borrowing a Cloudflare Browser
 * Rendering session from the `BrowserSessionDO` pool (CF-native migration,
 * Wave 2). NOT wired into any crawler, route, queue, or scheduled handler
 * yet — this is a drop-in for future callers, added in Wave 3 once live
 * Browser Rendering behaviour has been validated.
 *
 * @module handlers/browser/browser-service
 */

import puppeteerDefault from '@cloudflare/puppeteer';

/**
 * Run `fn` with a connected Browser Rendering session borrowed from the
 * `BROWSER_SESSION` Durable Object pool, releasing it when done regardless
 * of success or failure.
 *
 * @template T
 * @param {{BROWSER_SESSION: DurableObjectNamespace, MYBROWSER: unknown}} env
 * @param {(browser: import('@cloudflare/puppeteer').Browser) => Promise<T>} fn
 * @param {{puppeteer?: {connect: Function}, name?: string}} [opts]
 * @returns {Promise<T>}
 */
export async function withBrowserSession(env, fn, opts = {}) {
  const { puppeteer = puppeteerDefault, name = 'global' } = opts;

  const stub = env.BROWSER_SESSION.get(env.BROWSER_SESSION.idFromName(name));

  const acquireResponse = await stub.fetch('https://browser-session/acquire', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const acquired = await acquireResponse.json();

  if (!acquired || !acquired.sessionId) {
    const err = new Error(acquired?.error || 'Failed to acquire browser session');
    if (acquired?.code) err.code = acquired.code;
    throw err;
  }

  const { sessionId } = acquired;
  let browser;

  try {
    browser = await puppeteer.connect(env.MYBROWSER, sessionId);
    return await fn(browser);
  } finally {
    try {
      if (browser) await browser.disconnect();
    } catch {
      // best-effort — the session may already be disconnected
    }

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
}

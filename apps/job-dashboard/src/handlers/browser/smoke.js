/**
 * @fileoverview Admin-only live smoke test for the Cloudflare Browser Rendering
 * session broker (CF-native migration). Exercises the full Wave 2 path —
 * BrowserSessionDO acquire -> puppeteer.connect(sessionId) -> newPage -> goto ->
 * title -> release — against REAL Browser Rendering, so the owner can validate
 * the broker with a single request before Wave 3 wires a crawler through it.
 *
 * Route: GET /api/browser/smoke (admin-gated via ADMIN_ROUTES '/api/browser').
 * @module handlers/browser/smoke
 */

import { withBrowserSession as defaultWithBrowserSession } from './browser-service.js';

const DEFAULT_URL = 'https://example.com';

/**
 * Run the browser smoke test and return a plain result object (never throws).
 * @param {{BROWSER_SESSION: unknown, MYBROWSER: unknown}} env
 * @param {{withBrowserSession?: Function, url?: string, now?: () => number}} [opts]
 * @returns {Promise<{ok:boolean, title?:string, reused?:boolean, url?:string, error?:string, code?:string, elapsedMs:number}>}
 */
export async function runBrowserSmoke(env, opts = {}) {
  const {
    withBrowserSession = defaultWithBrowserSession,
    url = DEFAULT_URL,
    now = () => Date.now(),
  } = opts;
  const started = now();

  try {
    const data = await withBrowserSession(env, async (browser) => {
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        return { title: await page.title() };
      } finally {
        try {
          await page.close();
        } catch {
          // best-effort — session teardown is handled by withBrowserSession
        }
      }
    });

    return { ok: true, url, ...data, elapsedMs: now() - started };
  } catch (err) {
    return {
      ok: false,
      url,
      error: err?.message || String(err),
      ...(err?.code ? { code: err.code } : {}),
      elapsedMs: now() - started,
    };
  }
}

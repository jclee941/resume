/**
 * @fileoverview Mints a JobKorea session cookie (email/password login) and
 * stores it in KV as `auth:jobkorea` — analogous to handlers/wanted/mint-session.js,
 * but driven through the CF Browser Rendering broker (Wave 3) since JobKorea has
 * no public token endpoint. Page automation lives in ./page-helpers.js; this
 * module owns login orchestration. Nothing solves CAPTCHAs automatically, so a
 * CAPTCHA challenge fails the mint with JOBKOREA_CAPTCHA_REQUIRED and the
 * session has to be renewed manually.
 * @module handlers/jobkorea/mint-session
 */

import { withBrowserSession as defaultWithBrowserSession } from '../../services/browser-session.js';
import { restrictToJobKorea } from '../../services/jobkorea-request-filter.js';
import { writePlatformSession } from '../../services/platform-session.js';
import {
  SUBMIT_SELECTOR,
  fillLoginForm,
  submitAndWait,
  isLoggedIn,
  detectCaptcha,
  collectJobKoreaCookies,
} from './page-helpers.js';

export const AUTH_JOBKOREA_KEY = 'auth:jobkorea';
// /Login redirects to the unified login form (Login_Tot.asp); /Login/Login.asp
// redirects to the homepage, so use /Login.
export const JOBKOREA_LOGIN_URL = 'https://www.jobkorea.co.kr/Login';
export const JOBKOREA_SESSION_TTL_S = 60 * 60 * 6; // 6h

/**
 * @typedef {{
 *   JOBKOREA_USERNAME?: string;
 *   JOBKOREA_EMAIL?: string;
 *   JOBKOREA_PASSWORD?: string;
 *   BROWSER_SESSION: import('../../services/browser-session.js').DurableObjectNamespaceBinding;
 *   MYBROWSER: import('@cloudflare/puppeteer').ConnectOptions | import('@cloudflare/puppeteer').BrowserWorker;
 *   SESSIONS?: { put: Function };
 *   [key: string]: unknown;
 * }} JobKoreaEnv
 */

const LOGIN_BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);
const LOGIN_POLL_ATTEMPTS = 5;
const LOGIN_POLL_INTERVAL_MS = 1000; // ~5s worst case across LOGIN_POLL_ATTEMPTS

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mint a fresh JobKorea session cookie by logging in through the Browser
 * Rendering broker. Fails with code JOBKOREA_CAPTCHA_REQUIRED when JobKorea
 * presents a CAPTCHA.
 * @param {JobKoreaEnv} env
 * @param {{ withBrowserSession?: typeof defaultWithBrowserSession, pollIntervalMs?: number }} [opts]
 * @returns {Promise<string>} cookie string `name=value; name2=value2`
 */
export async function mintJobKoreaSession(
  env,
  { withBrowserSession = defaultWithBrowserSession, pollIntervalMs = LOGIN_POLL_INTERVAL_MS } = {}
) {
  const email = env?.JOBKOREA_USERNAME || env?.JOBKOREA_EMAIL;
  const password = env?.JOBKOREA_PASSWORD;
  if (!email)
    throw new Error('JOBKOREA_USERNAME (or JOBKOREA_EMAIL) is required to mint a JobKorea session');
  if (!password) throw new Error('JOBKOREA_PASSWORD is required to mint a JobKorea session');

  return withBrowserSession(env, async (browser) => {
    // The broker hands out pooled browser sessions, and their default context can still hold another
    // flow's JobKorea cookies; logged in, /Login redirects away from the form. Log in inside a fresh
    // context and close it so no login state is left in the pool either.
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    try {
      // Stylesheets stay allowed: which login tab's submit button is visible is decided by CSS.
      await restrictToJobKorea(page, LOGIN_BLOCKED_RESOURCE_TYPES);
      await page.goto(JOBKOREA_LOGIN_URL, { waitUntil: 'domcontentloaded' });
      await fillLoginForm(page, { email, password });
      await submitAndWait(page, SUBMIT_SELECTOR);

      let loggedIn = await isLoggedIn(page);
      let attempt = 0;
      while (!loggedIn && attempt < LOGIN_POLL_ATTEMPTS) {
        attempt++;
        if (await detectCaptcha(page)) {
          throw Object.assign(
            new Error('JobKorea presented a CAPTCHA; renew the JobKorea session manually'),
            { code: 'JOBKOREA_CAPTCHA_REQUIRED' }
          );
        }
        await sleep(pollIntervalMs);
        loggedIn = await isLoggedIn(page);
      }

      if (!loggedIn) {
        const url = typeof page.url === 'function' ? page.url() : JOBKOREA_LOGIN_URL;
        const title = await page.title().catch(() => '');
        throw new Error(`JobKorea login did not complete (url=${url}, title=${title})`);
      }

      const cookieString = await collectJobKoreaCookies(page);
      if (!cookieString)
        throw new Error('JobKorea login succeeded but no session cookies were found');
      return cookieString;
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
    }
  });
}

const MINT_ATTEMPTS = 2;
const LOGIN_PAGE_TIMEOUT = /Navigation timeout/i;

/**
 * Mint a JobKorea session and store it encrypted in KV as `auth:jobkorea`. Never
 * throws — callers (admin route, scheduled cron) get a plain result back
 * either way. Only the login page's own navigation can time out before any credentials are
 * submitted (submitAndWait swallows the post-submit wait), so that failure alone is retried, once,
 * in a fresh browser context.
 * @param {JobKoreaEnv & { SESSIONS: { put: Function } }} env
 * @param {{ withBrowserSession?: typeof defaultWithBrowserSession }} [opts]
 * @returns {Promise<{ ok: true, key: string, length: number, attempts?: number } | { ok: false, error: string, code?: unknown }>}
 */
export async function refreshJobKoreaSession(env, opts = {}) {
  /** @type {unknown} */
  let failure;
  for (let attempt = 1; attempt <= MINT_ATTEMPTS; attempt += 1) {
    try {
      const cookie = await mintJobKoreaSession(env, opts);
      await writePlatformSession(env, 'jobkorea', cookie, JOBKOREA_SESSION_TTL_S);
      return {
        ok: true,
        key: AUTH_JOBKOREA_KEY,
        length: cookie.length,
        ...(attempt > 1 ? { attempts: attempt } : {}),
      };
    } catch (err) {
      failure = err;
      const message = /** @type {{ message?: string } | null | undefined} */ (err)?.message ?? '';
      if (!LOGIN_PAGE_TIMEOUT.test(message)) break;
    }
  }
  const err = /** @type {{ message?: string; code?: unknown } | null | undefined} */ (failure);
  return {
    ok: false,
    error: err?.message || String(failure),
    ...(err?.code ? { code: err.code } : {}),
  };
}

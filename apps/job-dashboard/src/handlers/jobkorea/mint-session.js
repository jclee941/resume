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

import {
  withBrowserSession as defaultWithBrowserSession,
  settleWithin,
} from '../../services/browser-session.js';
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
const CLEANUP_TIMEOUT_MS = 5_000;

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
const LOGIN_PAGE_TIMEOUT = /Navigation timeout/i;
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
 * A timed-out login page names the requests it was still waiting for, so a stall can be traced to
 * the document or to a specific script.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {{ pending(): string[] }} requests
 * @returns {Promise<void>}
 */
async function openLoginPage(page, requests) {
  try {
    await page.goto(JOBKOREA_LOGIN_URL, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!LOGIN_PAGE_TIMEOUT.test(message)) throw error;
    const stalled = requests.pending().slice(0, 5).join(', ') || 'none';
    throw new Error(`${message}; pending: ${stalled}`, { cause: error });
  }
}

/**
 * Mint a fresh JobKorea session cookie by logging in through the Browser
 * Rendering broker. Fails with code JOBKOREA_CAPTCHA_REQUIRED when JobKorea
 * presents a CAPTCHA.
 * @param {JobKoreaEnv} env
 * @param {{ withBrowserSession?: typeof defaultWithBrowserSession, pollIntervalMs?: number, cleanupMs?: number }} [opts]
 * @returns {Promise<string>} cookie string `name=value; name2=value2`
 */
export async function mintJobKoreaSession(
  env,
  {
    withBrowserSession = defaultWithBrowserSession,
    pollIntervalMs = LOGIN_POLL_INTERVAL_MS,
    cleanupMs = CLEANUP_TIMEOUT_MS,
  } = {}
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
    /** @type {import('@cloudflare/puppeteer').Page | undefined} */
    let page;
    try {
      page = await context.newPage();
      // Stylesheets stay allowed: which login tab's submit button is visible is decided by CSS.
      const requests = await restrictToJobKorea(page, LOGIN_BLOCKED_RESOURCE_TYPES);
      await openLoginPage(page, requests);
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
      // A stalled page can leave these protocol calls pending for minutes; the cron's budget
      // cannot wait for them.
      if (page) await settleWithin(page.close(), cleanupMs);
      await settleWithin(context.close(), cleanupMs);
    }
  });
}

const MINT_ATTEMPTS = 2;

/**
 * Mint a JobKorea session and store it encrypted in KV as `auth:jobkorea`. Never
 * throws — callers (admin route, scheduled cron) get a plain result back
 * either way. Only the login page's own navigation can time out before any credentials are
 * submitted (submitAndWait swallows the post-submit wait), so that failure alone is retried in a
 * fresh browser context: at once by default, or after `retryDelayMs` when a caller such as the
 * daily cron can wait out a slow spell of the login page.
 * @param {JobKoreaEnv & { SESSIONS: { put: Function } }} env
 * @param {{ withBrowserSession?: typeof defaultWithBrowserSession, attempts?: number, retryDelayMs?: number, wait?: (ms: number) => Promise<void> }} [opts]
 * @returns {Promise<{ ok: true, key: string, length: number, attempts?: number } | { ok: false, error: string, code?: unknown }>}
 */
export async function refreshJobKoreaSession(env, opts = {}) {
  const { attempts = MINT_ATTEMPTS, retryDelayMs = 0, wait = sleep, ...mintOpts } = opts;
  /** @type {unknown} */
  let failure;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (attempt > 1 && retryDelayMs > 0) await wait(retryDelayMs);
    try {
      const cookie = await mintJobKoreaSession(env, mintOpts);
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

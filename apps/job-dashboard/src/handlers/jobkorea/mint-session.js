/**
 * @fileoverview Mints a JobKorea session cookie (email/password login) and
 * stores it in KV as `auth:jobkorea` — analogous to handlers/wanted/mint-session.js,
 * but driven through the CF Browser Rendering broker (Wave 3) since JobKorea has
 * no public token endpoint. Page automation lives in ./page-helpers.js; this
 * module owns login orchestration. A two-factor challenge is cleared with the emailed code
 * (./two-factor.js) and the resulting device trust is kept for later logins (./trusted-device.js).
 * Nothing solves CAPTCHAs automatically, so a CAPTCHA challenge fails the mint with
 * JOBKOREA_CAPTCHA_REQUIRED and the session has to be renewed manually.
 * @module handlers/jobkorea/mint-session
 */

import { settleWithin } from '../../services/browser-session.js';
import { withJobKoreaBrowserSession as defaultWithBrowserSession } from '../../services/jobkorea-browser-session.js';
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
import {
  JOBKOREA_2FA_REQUIRED,
  hasTwoFactorBindings,
  isTwoFactorPage,
  resolveTwoFactor,
} from './two-factor.js';
import { injectTrustedDevice, rememberTrustedDevice } from './trusted-device.js';

export { JOBKOREA_2FA_REQUIRED };

export const AUTH_JOBKOREA_KEY = 'auth:jobkorea';
// /Login redirects to the unified login form (Login_Tot.asp); /Login/Login.asp
// redirects to the homepage, so use /Login.
export const JOBKOREA_LOGIN_URL = 'https://www.jobkorea.co.kr/Login';
export const JOBKOREA_MY_PAGE_URL = 'https://www.jobkorea.co.kr/user/mypage';
export const JOBKOREA_SESSION_TTL_S = 60 * 60 * 6; // 6h
const CLEANUP_TIMEOUT_MS = 5_000;

/**
 * @typedef {{
 *   JOBKOREA_USERNAME?: string;
 *   JOBKOREA_EMAIL?: string;
 *   JOBKOREA_PASSWORD?: string;
 *   REMEMBER_BROWSER_ACCOUNT_ID?: string;
 *   REMEMBER_BROWSER_API_TOKEN?: string;
 *   BROWSER_SESSION: import('../../services/browser-session.js').DurableObjectNamespaceBinding;
 *   MYBROWSER: import('@cloudflare/puppeteer').ConnectOptions | import('@cloudflare/puppeteer').BrowserWorker;
 *   SESSIONS?: { get: Function, put: Function };
 *   [key: string]: unknown;
 * }} JobKoreaEnv
 * @typedef {{
 *   email: string;
 *   password: string;
 *   pollIntervalMs: number;
 *   assertOpen: (next: string) => void;
 *   twoFactor: import('./two-factor.js').TwoFactorOptions;
 * }} LoginPlan
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
 * JobKorea redirects a login from a browser it does not trust to /user/TwoFactorAuth/Index and
 * blocks every page behind it. The first challenge is cleared with the emailed code and the
 * device trust it grants is stored; a second one in the same login stops it.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {JobKoreaEnv} env
 * @param {LoginPlan} plan
 * @returns {() => Promise<void>}
 */
function twoFactorGate(page, env, { assertOpen, twoFactor }) {
  let cleared = false;
  return async () => {
    if (!isTwoFactorPage(page)) return;
    if (cleared || !hasTwoFactorBindings(env)) {
      const why = cleared ? 'asked for it again' : 'cannot be cleared without KV and D1 bindings';
      throw Object.assign(
        new Error(`${JOBKOREA_2FA_REQUIRED}: JobKorea two-factor authentication ${why}`),
        { code: JOBKOREA_2FA_REQUIRED }
      );
    }
    cleared = true;
    const before = await page.cookies();
    await resolveTwoFactor(page, env, { ...twoFactor, assertOpen });
    await rememberTrustedDevice(env, { before, after: await page.cookies() });
  };
}

/**
 * POST /Login/Login.asp answers with a success page that already sets the session cookies and
 * leaves the move to My Page to a hidden Login_Log_Check.asp iframe (next to a password-campaign
 * popup). Inside Browser Rendering that hop can stall or fail, so open My Page directly and check
 * the session there; a failed login lands back on the login form.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {() => Promise<void>} clearTwoFactor
 * @returns {Promise<boolean>}
 */
async function openMyPage(page, clearTwoFactor) {
  await page
    .goto(JOBKOREA_MY_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 })
    .catch(() => {});
  await clearTwoFactor();
  return isLoggedIn(page);
}

/**
 * Logs in on a page whose login form is open (trust cookies already set) and polls until the
 * session shows.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {JobKoreaEnv} env
 * @param {LoginPlan} plan
 * @returns {Promise<boolean>}
 */
async function submitLogin(page, env, plan) {
  const { email, password, pollIntervalMs, assertOpen } = plan;
  const clearTwoFactor = twoFactorGate(page, env, plan);
  assertOpen('the login form was filled');
  await fillLoginForm(page, { email, password });
  assertOpen('the login was submitted');
  await submitAndWait(page, SUBMIT_SELECTOR);
  await clearTwoFactor();

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
    await clearTwoFactor();
    loggedIn = await isLoggedIn(page);
  }
  return loggedIn || openMyPage(page, clearTwoFactor);
}

/**
 * Mint a fresh JobKorea session cookie by logging in through the Browser
 * Rendering broker. Fails with code JOBKOREA_CAPTCHA_REQUIRED when JobKorea
 * presents a CAPTCHA.
 * @param {JobKoreaEnv} env
 * @param {{ withBrowserSession?: typeof defaultWithBrowserSession, pollIntervalMs?: number, cleanupMs?: number, assertOpen?: (next: string) => void, twoFactor?: import('./two-factor.js').TwoFactorOptions }} [opts]
 *   `assertOpen(next)` throws once the caller has given up; it runs before the form is filled,
 *   before it is submitted and before a two-factor code is requested, so nothing goes out after that
 * @returns {Promise<string>} cookie string `name=value; name2=value2`
 */
export async function mintJobKoreaSession(
  env,
  {
    withBrowserSession = defaultWithBrowserSession,
    pollIntervalMs = LOGIN_POLL_INTERVAL_MS,
    cleanupMs = CLEANUP_TIMEOUT_MS,
    assertOpen = () => {},
    twoFactor = {},
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
      // A JS confirm (e.g. "개인회원 로그인 후 이용해 주세요") would otherwise block the page.
      page.on('dialog', (dialog) => void dialog.dismiss().catch(() => {}));
      // Stylesheets stay allowed: which login tab's submit button is visible is decided by CSS.
      const requests = await restrictToJobKorea(page, LOGIN_BLOCKED_RESOURCE_TYPES);
      const trusted = await injectTrustedDevice(page, env);
      await openLoginPage(page, requests);
      const plan = { email, password, pollIntervalMs, assertOpen, twoFactor };
      // Trust cookies that still carry a session open the login page already logged in.
      const loggedIn =
        (trusted && (await isLoggedIn(page))) || (await submitLogin(page, env, plan));

      if (!loggedIn) {
        const url = typeof page.url === 'function' ? page.url() : JOBKOREA_LOGIN_URL;
        const title = await page.title().catch(() => '');
        const failed = requests.failed().join(', ') || 'none';
        throw new Error(
          `JobKorea login did not complete (url=${url}, title=${title}, failed: ${failed})`
        );
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

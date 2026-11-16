/**
 * @fileoverview JobKorea trusts a browser for three months after a two-factor verification. The
 * trust lives in that browser's JobKorea cookies (which ones is not published), so after a
 * verification the persistent JobKorea cookies are stored encrypted in KV as
 * `auth:jobkorea-trust` and set on the next login's fresh context before the login page opens.
 * Session-only cookies are left out: a real browser drops them on restart and still stays trusted.
 * @module handlers/jobkorea/trusted-device
 */

import { readPlatformSession, writePlatformSession } from '../../services/platform-session.js';

const TRUST_PLATFORM = 'jobkorea-trust';
const MAX_TRUST_TTL_S = 90 * 24 * 60 * 60;
const MIN_TRUST_TTL_S = 60;

/**
 * @typedef {import('@cloudflare/puppeteer').Cookie} Cookie
 * @typedef {{
 *   name: string;
 *   value: string;
 *   domain: string;
 *   path: string;
 *   expires: number;
 *   httpOnly: boolean;
 *   secure: boolean;
 *   sameSite?: import('@cloudflare/puppeteer').CookieSameSite;
 * }} TrustedCookie
 */

/**
 * @param {{ domain?: string }} cookie
 * @returns {boolean}
 */
function isJobKoreaCookie(cookie) {
  return (cookie.domain || '').includes('jobkorea.co.kr');
}

/**
 * @param {Cookie} cookie
 * @returns {string}
 */
function cookieKey(cookie) {
  return `${cookie.domain}|${cookie.path}|${cookie.name}`;
}

/**
 * @param {Cookie} cookie
 * @returns {TrustedCookie}
 */
function toTrustedCookie({ name, value, domain, path, expires, httpOnly, secure, sameSite }) {
  return {
    name,
    value,
    domain,
    path,
    expires,
    httpOnly,
    secure,
    ...(sameSite ? { sameSite } : {}),
  };
}

/**
 * @param {string} stored
 * @param {number} nowS epoch seconds
 * @returns {TrustedCookie[]}
 */
function parseTrustedCookies(stored, nowS) {
  try {
    const cookies = JSON.parse(stored);
    if (!Array.isArray(cookies)) return [];
    return /** @type {TrustedCookie[]} */ (cookies).filter((cookie) => cookie.expires > nowS);
  } catch {
    return [];
  }
}

/**
 * Sets the stored trust cookies on the page's context before the login page opens.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {Parameters<typeof readPlatformSession>[0]} env
 * @param {() => number} [clock]
 * @returns {Promise<boolean>} whether any trust cookie was set
 */
export async function injectTrustedDevice(page, env, clock = Date.now) {
  const stored = await readPlatformSession(env, TRUST_PLATFORM);
  if (!stored) return false;
  const cookies = parseTrustedCookies(stored, clock() / 1000);
  if (cookies.length === 0) return false;
  await page.setCookie(...cookies);
  return true;
}

/**
 * Stores the context's persistent JobKorea cookies after a verification, kept no longer than the
 * latest of them (and at most 90 days), and logs which cookie names the verification changed.
 * @param {Parameters<typeof writePlatformSession>[0]} env
 * @param {{ before: Cookie[], after: Cookie[] }} snapshot cookies before and after the verification
 * @param {() => number} [clock]
 * @returns {Promise<string[]>} names of the JobKorea cookies the verification set or changed
 */
export async function rememberTrustedDevice(env, { before, after }, clock = Date.now) {
  const nowS = clock() / 1000;
  const prior = new Map(before.filter(isJobKoreaCookie).map((c) => [cookieKey(c), c.value]));
  const jobkorea = after.filter(isJobKoreaCookie);
  const changed = [
    ...new Set(jobkorea.filter((c) => prior.get(cookieKey(c)) !== c.value).map((c) => c.name)),
  ];
  console.log(`[jobkorea-2fa] verification changed cookies: ${changed.join(', ') || 'none'}`);

  const persistent = jobkorea.filter((cookie) => cookie.expires > nowS);
  if (persistent.length === 0) return changed;
  const latest = Math.max(...persistent.map((cookie) => cookie.expires));
  const ttl = Math.max(MIN_TRUST_TTL_S, Math.min(Math.floor(latest - nowS), MAX_TRUST_TTL_S));
  await writePlatformSession(
    env,
    TRUST_PLATFORM,
    JSON.stringify(persistent.map(toTrustedCookie)),
    ttl,
    { changedCookies: changed }
  );
  return changed;
}

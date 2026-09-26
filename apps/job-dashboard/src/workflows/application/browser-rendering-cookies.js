import { readPlatformSession } from '../../services/platform-session.js';

/**
 * @typedef {{
 *   name: string;
 *   value: string;
 *   domain: string;
 *   path: string;
 *   secure: boolean;
 * }} CookieItem
 *
 * @typedef {{
 *   env: { SESSIONS?: { get: Function }; ENCRYPTION_KEY?: string; [key: string]: unknown };
 *   [key: string]: unknown;
 * }} BrowserRenderingWorkflowContext
 *
 * @typedef {{
 *   setCookie?: (...cookies: CookieItem[]) => Promise<unknown>;
 *   [key: string]: unknown;
 * }} BrowserPageLike
 */

/**
 * @param {BrowserRenderingWorkflowContext} ctx
 * @param {BrowserPageLike} page
 * @param {string} platform
 * @param {string} targetUrl
 * @returns {Promise<number>}
 */
export async function hydrateSessionCookies(ctx, page, platform, targetUrl) {
  const cookieHeader = await getPlatformCookieHeader(ctx, platform);
  const cookies = parseCookieHeader(cookieHeader, targetUrl);
  if (cookies.length === 0 || typeof page.setCookie !== 'function') return 0;
  await page.setCookie(...cookies);
  return cookies.length;
}

/**
 * @param {BrowserRenderingWorkflowContext} ctx
 * @param {string} platform
 * @returns {Promise<string>}
 */
async function getPlatformCookieHeader(ctx, platform) {
  const raw = await readPlatformSession(ctx?.env, platform);
  if (!raw) return '';

  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return raw;

  try {
    const parsed = JSON.parse(trimmed);
    return parsed.cookieHeader || parsed.cookie || cookiesToHeader(parsed.cookies) || '';
  } catch {
    return raw;
  }
}

/**
 * @param {unknown} cookies
 * @returns {string}
 */
function cookiesToHeader(cookies) {
  if (!Array.isArray(cookies)) return '';
  return cookies
    .filter(
      (/** @type {Record<string, unknown>} */ cookie) => cookie?.name && cookie?.value != null
    )
    .map((/** @type {Record<string, unknown>} */ cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

/**
 * @param {string | null | undefined} cookieHeader
 * @param {string} targetUrl
 * @returns {CookieItem[]}
 */
function parseCookieHeader(cookieHeader, targetUrl) {
  if (!cookieHeader) return [];
  const { hostname } = new URL(targetUrl);
  return /** @type {CookieItem[]} */ (
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        if (separator <= 0) return null;
        return {
          name: part.slice(0, separator).trim(),
          value: part.slice(separator + 1).trim(),
          domain: hostname,
          path: '/',
          secure: true,
        };
      })
      .filter(Boolean)
  );
}

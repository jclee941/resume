/**
 * @fileoverview Remember's Cloudflare WAF answers 403 to every request from Cloudflare's Worker
 * IP ranges, so the Worker cannot reach Remember with a plain `fetch`. Cloudflare Browser
 * Rendering runs on separate infrastructure that Remember does accept, so each Remember request
 * is replayed from a Browser Rendering page: the request runs as a same-origin `fetch` inside the
 * page (which carries the real browser's TLS and headers), and the response — including the
 * Set-Cookie values login needs — is handed back as a normal `Response`. Without `MYBROWSER`
 * this is a plain `fetch`, so tests that inject their own fetch are unaffected.
 * @module services/remember/remember-fetch
 */
import { withBrowserSession as defaultWithBrowserSession } from '../browser-session.js';

const PAGE_GOTO_TIMEOUT_MS = 20_000;
/** The Remember web app origin whose requests the API hosts accept; login stays on its own host. */
const APP_ORIGIN = 'https://career.rememberapp.co.kr';
const LOGIN_ORIGIN = 'https://rememberapp.co.kr';
const BODYLESS_STATUS = new Set([101, 204, 205, 304]);
/** Headers a browser sets itself; a page `fetch` rejects or ignores them. */
const FORBIDDEN_HEADERS = new Set([
  'cookie',
  'host',
  'content-length',
  'connection',
  'user-agent',
  'origin',
  'referer',
  'accept-encoding',
  'accept-charset',
  'keep-alive',
  'transfer-encoding',
]);

/**
 * @typedef {{ MYBROWSER?: unknown; BROWSER_SESSION?: unknown }} RememberBrowserEnv
 * @typedef {{ withBrowserSession?: typeof defaultWithBrowserSession }} RememberFetchOptions
 */

/**
 * The fetch the Remember code should use: a Browser Rendering replay when `MYBROWSER` is bound,
 * otherwise a plain `fetch`.
 * @param {RememberBrowserEnv} [env]
 * @param {RememberFetchOptions} [options]
 * @returns {typeof fetch}
 */
export function rememberFetch(env, options = {}) {
  if (!env?.MYBROWSER) return fetch;
  const withBrowserSession = options.withBrowserSession ?? defaultWithBrowserSession;
  return /** @type {typeof fetch} */ (
    (url, init = {}) =>
      withBrowserSession(/** @type {any} */ (env), (browser) =>
        renderFetch(browser, String(url), init ?? {})
      )
  );
}

/**
 * @param {import('@cloudflare/puppeteer').Browser} browser
 * @param {string} url
 * @param {RequestInit} init
 * @returns {Promise<Response>}
 */
async function renderFetch(browser, url, init) {
  const page = await browser.newPage();
  try {
    const target = new URL(url);
    const pageOrigin = target.origin === LOGIN_ORIGIN ? LOGIN_ORIGIN : APP_ORIGIN;
    const headers = headerPairs(init.headers);
    const cookies = cookieParam(headers, target.origin);
    if (cookies.length > 0) await page.setCookie(...cookies);
    await establishOrigin(page, pageOrigin);
    const result = await page.evaluate(pageFetch, url, {
      method: init.method ?? 'GET',
      headers: Object.fromEntries(
        headers.filter(([key]) => !FORBIDDEN_HEADERS.has(key.toLowerCase()))
      ),
      body: init.body == null ? null : String(init.body),
    });
    const outHeaders = new Headers(result.headers);
    for (const cookie of await page.cookies(target.origin, pageOrigin)) {
      outHeaders.append('set-cookie', `${cookie.name}=${cookie.value}`);
    }
    const body = BODYLESS_STATUS.has(result.status) ? null : result.body;
    return new Response(body, { status: result.status, headers: outHeaders });
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Serves a blank document on `origin` so the page runs on that origin without loading the real
 * site: the career app is a single-page app that redirects an unauthenticated visitor off the
 * origin before the fetch runs, which would make the API call cross-origin from the wrong origin.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string} origin
 * @returns {Promise<void>}
 */
async function establishOrigin(page, origin) {
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      request.respond({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>r</title>',
      });
    } else {
      request.continue();
    }
  });
  await page
    .goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout: PAGE_GOTO_TIMEOUT_MS })
    .catch(() => {});
}

/**
 * Runs inside the Browser Rendering page. `credentials: 'same-origin'` sends cookies for the
 * same-origin login but none for the cross-origin API calls, which authenticate with the
 * Authorization header: Remember's APIs allow the career origin but do not set
 * Access-Control-Allow-Credentials, so a credentialed cross-origin read would be blocked.
 * Set-Cookie is not readable here, so the caller reads it from the cookie jar.
 * @param {string} url
 * @param {{ method: string; headers: Record<string, string>; body: string | null }} init
 * @returns {Promise<{ status: number; body: string; headers: Array<[string, string]> }>}
 */
function pageFetch(url, init) {
  return fetch(url, {
    method: init.method,
    headers: init.headers,
    body: init.body,
    credentials: 'same-origin',
  }).then(async (response) => ({
    status: response.status,
    body: await response.text(),
    headers: [...response.headers],
  }));
}

/**
 * The `Cookie` request header as Puppeteer cookies for the page, since a page `fetch` cannot set
 * `Cookie` itself.
 * @param {Array<[string, string]>} headers
 * @param {string} origin
 * @returns {Array<{ name: string; value: string; url: string }>}
 */
function cookieParam(headers, origin) {
  const header = headers.find(([key]) => key.toLowerCase() === 'cookie')?.[1];
  if (!header) return [];
  return header
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf('=');
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: origin };
    })
    .filter((cookie) => cookie.name);
}

/**
 * @param {HeadersInit | undefined} headers
 * @returns {Array<[string, string]>}
 */
function headerPairs(headers) {
  if (!headers) return [];
  if (headers instanceof Headers) return [...headers];
  if (Array.isArray(headers)) return headers.map(([key, value]) => [key, String(value)]);
  return Object.entries(headers).map(([key, value]) => [key, String(value)]);
}

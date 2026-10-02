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
/** A stable document on each origin: the app root is a single-page app that redirects an
 * unauthenticated visitor within a second or two, which aborts the in-page fetch; robots.txt stays
 * put and still runs an injected script. */
const STABLE_PATH = '/robots.txt';
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
    await page
      .goto(`${pageOrigin}${STABLE_PATH}`, {
        waitUntil: 'domcontentloaded',
        timeout: PAGE_GOTO_TIMEOUT_MS,
      })
      .catch(() => {});
    const safeHeaders = Object.fromEntries(
      headers.filter(([key]) => !FORBIDDEN_HEADERS.has(key.toLowerCase()))
    );
    const marker = `rememberfetch${crypto.randomUUID().replace(/-/g, '')}`;
    await page.addScriptTag({
      content: buildFetchScript(marker, url, {
        method: init.method ?? 'GET',
        headers: safeHeaders,
        body: init.body == null ? null : String(init.body),
      }),
    });
    await page.waitForSelector(`#${marker}`, { timeout: PAGE_GOTO_TIMEOUT_MS });
    const payload = await page.$eval(`#${marker}`, (el) => el.textContent);
    const result = JSON.parse(payload || '{}');
    if (result.error) {
      throw new Error(`Remember browser fetch ${target.host} from ${page.url()}: ${result.error}`);
    }
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
 * A classic script that runs the request in the page's main world and writes the result into a
 * hidden element for the caller to read. `page.evaluate` runs in an isolated world whose origin is
 * opaque, so its cross-origin fetch is seen as coming from `null` and CORS rejects it; a script
 * added to the document runs in the real page origin, which Remember's APIs accept.
 * `credentials: 'same-origin'` sends cookies for the same-origin login but none for the
 * cross-origin API calls, which authenticate with the Authorization header (Remember's APIs allow
 * the career origin but do not set Access-Control-Allow-Credentials). Set-Cookie is not readable
 * here, so the caller reads it from the cookie jar.
 * @param {string} marker
 * @param {string} url
 * @param {{ method: string; headers: Record<string, string>; body: string | null }} init
 * @returns {string}
 */
function buildFetchScript(marker, url, init) {
  return `(async () => {
    const write = (data) => {
      const el = document.createElement('div');
      el.id = ${JSON.stringify(marker)};
      el.style.display = 'none';
      el.textContent = JSON.stringify(data);
      document.body.appendChild(el);
    };
    try {
      const response = await fetch(${JSON.stringify(url)}, {
        method: ${JSON.stringify(init.method)},
        headers: ${JSON.stringify(init.headers)},
        body: ${JSON.stringify(init.body)},
        credentials: 'same-origin',
      });
      write({ status: response.status, body: await response.text(), headers: [...response.headers] });
    } catch (error) {
      write({ error: String((error && error.message) || error) });
    }
  })();`;
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

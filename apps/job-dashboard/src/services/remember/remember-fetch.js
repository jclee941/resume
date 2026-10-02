/**
 * @fileoverview Remember's Cloudflare WAF answers 403 to a Worker fetch and to the Browser
 * Rendering binding (both on Cloudflare's own IP ranges), but the Cloudflare Browser Rendering
 * REST API runs on infrastructure Remember accepts. So each Remember request is replayed from a
 * Browser Rendering REST page: an injected main-world script runs the request as a page `fetch`
 * (which carries the real browser's origin, TLS and headers) and writes the result back. This is
 * fully Cloudflare-native. Without `REMEMBER_BROWSER_ACCOUNT_ID` and `REMEMBER_BROWSER_API_TOKEN`
 * it is a plain `fetch`, so tests that inject their own fetch are unaffected.
 * @module services/remember/remember-fetch
 */

const BROWSER_RENDERING_URL = 'https://api.cloudflare.com/client/v4/accounts';
const PAGE_TIMEOUT_MS = 20_000;
const BODYLESS_STATUS = new Set([101, 204, 205, 304]);
/** The Remember web app origin whose requests the API hosts accept; login stays on its own host. */
const APP_ORIGIN = 'https://career.rememberapp.co.kr';
const LOGIN_ORIGIN = 'https://rememberapp.co.kr';
/** A stable document on each origin: the app root is a single-page app that redirects an
 * unauthenticated visitor within a second or two, which aborts the in-page fetch. */
const STABLE_PATH = '/robots.txt';
/** `code` of the error for a request the page could not complete (its `fetch` threw or it never
 * reported back). Browser Rendering sessions hit this transiently, so a caller may retry it. */
export const REMEMBER_BROWSER_FETCH_FAILED = 'REMEMBER_BROWSER_FETCH_FAILED';
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
 * @typedef {{ REMEMBER_BROWSER_ACCOUNT_ID?: unknown; REMEMBER_BROWSER_API_TOKEN?: unknown }} RememberBrowserEnv
 * @typedef {{ apiFetch?: typeof fetch }} RememberFetchOptions
 */

/**
 * The fetch the Remember code should use: a Browser Rendering REST replay when the account id and
 * API token are set, otherwise a plain `fetch`.
 * @param {RememberBrowserEnv} [env]
 * @param {RememberFetchOptions} [options]
 * @returns {typeof fetch}
 */
export function rememberFetch(env, options = {}) {
  const account = String(env?.REMEMBER_BROWSER_ACCOUNT_ID ?? '').trim();
  const token = String(env?.REMEMBER_BROWSER_API_TOKEN ?? '');
  if (!account || !token) return fetch;
  const apiFetch = options.apiFetch ?? fetch;
  return /** @type {typeof fetch} */ (
    (url, init = {}) => renderFetch(apiFetch, account, token, String(url), init ?? {})
  );
}

/**
 * @param {typeof fetch} apiFetch
 * @param {string} account
 * @param {string} token
 * @param {string} url
 * @param {RequestInit} init
 * @returns {Promise<Response>}
 */
async function renderFetch(apiFetch, account, token, url, init) {
  const target = new URL(url);
  const pageOrigin = target.origin === LOGIN_ORIGIN ? LOGIN_ORIGIN : APP_ORIGIN;
  const headers = headerPairs(init.headers);
  const marker = `rememberfetch${crypto.randomUUID().replace(/-/g, '')}`;
  const script = buildFetchScript(marker, url, {
    method: init.method ?? 'GET',
    headers: Object.fromEntries(
      headers.filter(([key]) => !FORBIDDEN_HEADERS.has(key.toLowerCase()))
    ),
    body: init.body == null ? null : String(init.body),
  });
  /** @type {Record<string, unknown>} */
  const payload = {
    url: `${pageOrigin}${STABLE_PATH}`,
    addScriptTag: [{ content: script }],
    waitForSelector: { selector: `#${marker}`, timeout: PAGE_TIMEOUT_MS },
  };
  const cookies = cookieParam(headers, target);
  if (cookies.length > 0) payload.cookies = cookies;
  const response = await apiFetch(`${BROWSER_RENDERING_URL}/${account}/browser-rendering/content`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || typeof body.result !== 'string') {
    throw new Error(`Remember Browser Rendering request failed (${response.status})`);
  }
  const result = readMarker(body.result, marker);
  if (!result || result.error) {
    const message = `Remember browser fetch ${target.host}: ${result?.error ?? 'no result'}`;
    throw Object.assign(new Error(message), { code: REMEMBER_BROWSER_FETCH_FAILED });
  }
  const status = result.status ?? 200;
  const outBody = BODYLESS_STATUS.has(status) ? null : (result.body ?? null);
  return new Response(outBody, { status, headers: new Headers(result.headers ?? []) });
}

/**
 * A classic script that runs the request in the page's main world (the real page origin, which
 * Remember's APIs accept — `page.evaluate`'s isolated world has an opaque origin that CORS
 * rejects) and writes the base64 of the result into a hidden element the caller reads.
 * `credentials: 'same-origin'` sends cookies for the same-origin login but none for the
 * cross-origin API calls, which authenticate with the Authorization header (Remember's APIs allow
 * the career origin but do not set Access-Control-Allow-Credentials).
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
      el.textContent = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
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
 * @param {string} html the rendered page
 * @param {string} marker
 * @returns {{ status?: number; body?: string; headers?: Array<[string, string]>; error?: string } | null}
 */
function readMarker(html, marker) {
  const match = html.match(new RegExp(`<div id="${marker}"[^>]*>([A-Za-z0-9+/=]*)</div>`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(match[1]))));
  } catch {
    return null;
  }
}

/**
 * The `Cookie` request header as Browser Rendering cookies, since a page `fetch` cannot set
 * `Cookie` itself. They are scoped to the registrable domain so every rememberapp.co.kr subdomain
 * sees them.
 * @param {Array<[string, string]>} headers
 * @param {URL} target
 * @returns {Array<{ name: string; value: string; domain: string; path: string }>}
 */
function cookieParam(headers, target) {
  const header = headers.find(([key]) => key.toLowerCase() === 'cookie')?.[1];
  if (!header) return [];
  const domain = `.${target.hostname.split('.').slice(-3).join('.')}`;
  return header
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf('=');
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), domain, path: '/' };
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

/**
 * Cookie helpers for Worker / Node runtimes.
 *
 * SSOT-034 / issue #43 Phase 2 step 1 — extracts the cookie parse +
 * serialize primitives that previously lived per-app in
 * `apps/job-dashboard/src/services/auth.js` and the codegen at
 * `apps/portfolio/lib/auth.js`. Pure functions; no I/O; deterministic.
 *
 * The cookie envelope is plain text. Signing/verification of a cookie
 * value uses HMAC-SHA256 from `@resume/shared/crypto/hmac` (when that
 * module lands in SSOT-033 Phase 3) — this module deals with parse,
 * serialize, and attribute composition only.
 */

/**
 * Parse a `Cookie:` header into a flat name → value map.
 *
 * Multiple cookies share the same separator (`;`); each key/value pair is
 * separated by `=`. Values that themselves contain `=` (signed tokens,
 * base64) are preserved by joining the rest of the splits.
 *
 * @param {string|null|undefined} cookieHeader
 * @returns {Record<string, string>}
 */
export function parseCookieHeader(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  const out = {};
  for (const piece of cookieHeader.split(';')) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) {
      out[trimmed] = '';
      continue;
    }
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1);
    if (name) out[name] = value;
  }
  return out;
}

/**
 * Read a single cookie's value out of a `Request`-shaped object.
 *
 * Accepts either:
 *  - a `Request` with `.headers.get('Cookie')` (Cloudflare Worker / fetch),
 *  - a Fastify-shaped request with `.headers.cookie` (Node).
 *
 * @param {object} request
 * @param {string} name
 * @returns {string|null}
 */
export function getCookie(request, name) {
  const header =
    (request?.headers?.get && request.headers.get('Cookie')) ||
    request?.headers?.cookie ||
    request?.headers?.Cookie ||
    null;
  if (!header) return null;
  const value = parseCookieHeader(header)[name];
  return value === undefined ? null : value;
}

/**
 * Serialize a `Set-Cookie` header value with the canonical safe defaults:
 *
 *   `name=value; Path=/; HttpOnly; Secure; SameSite=Strict`
 *
 * Callers can override individual attributes, but the secure defaults are
 * applied unless explicitly disabled. Empty `value` with `maxAge: 0`
 * produces a cookie-clearing header.
 *
 * @param {string} name
 * @param {string} value
 * @param {object} [options]
 * @param {string} [options.path='/']
 * @param {string} [options.domain]
 * @param {number} [options.maxAge] - seconds; omit for session cookie
 * @param {Date|string} [options.expires]
 * @param {boolean} [options.httpOnly=true]
 * @param {boolean} [options.secure=true]
 * @param {'Strict'|'Lax'|'None'} [options.sameSite='Strict']
 * @returns {string}
 */
export function serializeCookie(name, value, options = {}) {
  if (!name || typeof name !== 'string') {
    throw new TypeError('serializeCookie: name must be a non-empty string');
  }
  const safeValue = value == null ? '' : String(value);

  const parts = [`${name}=${safeValue}`];
  parts.push(`Path=${options.path || '/'}`);

  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) {
    const expires =
      options.expires instanceof Date ? options.expires.toUTCString() : String(options.expires);
    parts.push(`Expires=${expires}`);
  }

  const httpOnly = options.httpOnly !== false;
  if (httpOnly) parts.push('HttpOnly');

  const secure = options.secure !== false;
  if (secure) parts.push('Secure');

  const sameSite = options.sameSite || 'Strict';
  parts.push(`SameSite=${sameSite}`);

  return parts.join('; ');
}

/**
 * Convenience: build a `Set-Cookie` value for clearing a named cookie.
 *
 * @param {string} name
 * @param {object} [options] - same shape as `serializeCookie`
 * @returns {string}
 */
export function clearCookie(name, options = {}) {
  return serializeCookie(name, '', { ...options, maxAge: 0 });
}

export { parseCookies, serializeCookie, clearCookieHeader } from './cookie.js';
export { signHmacWebCrypto, verifyHmacWebCrypto, timingSafeEqualString } from './hmac.js';

/**
 * Check whether an expiration timestamp (in milliseconds) has passed.
 * @param {unknown} [expiresAt] - Epoch millisecond timestamp, or unvalidated value
 * @param {number} [now] - Current epoch millisecond timestamp (defaults to Date.now())
 * @returns {boolean}
 */
export function isExpired(expiresAt, now = Date.now()) {
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return true;
  return expiresAt <= now;
}

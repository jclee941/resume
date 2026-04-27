export { parseCookies, serializeCookie, clearCookieHeader } from './cookie.js';
export { signHmacWebCrypto, verifyHmacWebCrypto, timingSafeEqualString } from './hmac.js';

export function isExpired(expiresAt, now = Date.now()) {
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return true;
  return expiresAt <= now;
}

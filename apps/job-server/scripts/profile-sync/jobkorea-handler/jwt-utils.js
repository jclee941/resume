/**
 * JWT utility for JobKorea session validation.
 * The `jkat` cookie is a JWT access token with a ~30-minute lifetime.
 */

/**
 * @typedef {object} JwtPayload
 * @property {number} [exp]
 * @property {number} [iat]
 * @property {string} [sub]
 */

/**
 * @param {string | null | undefined} token
 * @returns {JwtPayload | null}
 */
function parseJwt(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    return payload;
  } catch {
    return null;
  }
}

/**
 * @param {string | null | undefined} cookieString
 * @param {string} name
 * @returns {string | null}
 */
function extractCookieValue(cookieString, name) {
  if (!cookieString || typeof cookieString !== 'string') {
    return null;
  }
  const regex = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`);
  const match = cookieString.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Check if the `jkat` JWT in the cookie string is expired.
 * Returns true if expired or missing.
 * @param {string | null | undefined} cookieString
 * @returns {boolean}
 */
export function isJwtExpired(cookieString) {
  const jkat = extractCookieValue(cookieString, 'jkat');
  if (!jkat) {
    return true;
  }
  const payload = parseJwt(jkat);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }
  // Add 60-second buffer to account for clock skew
  return payload.exp * 1000 < Date.now() + 60000;
}

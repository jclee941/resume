/**
 * @typedef {Object} CookieEntry
 * @property {string} name
 * @property {string} value
 */

/**
 * @typedef {Object} ProfileIdentity
 * @property {string | number} [id]
 * @property {string} [email]
 * @property {string} [name]
 */

/**
 * @param {string | CookieEntry[] | unknown} cookies
 * @returns {string}
 */
export function toCookieString(cookies) {
  if (typeof cookies === 'string') {
    return cookies;
  }

  if (Array.isArray(cookies)) {
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }

  return String(cookies);
}

/**
 * @param {string} cookieString
 * @param {CookieEntry[] | unknown} [cookies]
 * @returns {number}
 */
export function countCookies(cookieString, cookies) {
  if (Array.isArray(cookies)) {
    return cookies.length;
  }

  return cookieString.split(';').filter(Boolean).length;
}

/**
 * @param {ProfileIdentity} profile
 * @returns {{ id: string | number | undefined, email: string | undefined, name: string | undefined }}
 */
export function buildUser(profile) {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
  };
}

/**
 * @param {ProfileIdentity | null | undefined} profile
 * @returns {boolean}
 */
export function hasProfileIdentity(profile) {
  return Boolean(profile && (profile.id || profile.email || profile.name));
}

export function sessionExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

import { clearCookie, getCookie, parseCookieHeader, serializeCookie } from '../cookies/index.js';

export { clearCookie, getCookie, parseCookieHeader, serializeCookie };

/** @param {Array<{name:string,value:string}>} cookies */
export function cookieArrayToString(cookies) {
  return Array.isArray(cookies) ? cookies.map((c) => `${c.name}=${c.value}`).join('; ') : '';
}

/** @param {string} cookieString */
export function countCookieString(cookieString) {
  return typeof cookieString === 'string' ? cookieString.split(';').filter(Boolean).length : 0;
}

/**
 * @param {string} name
 * @param {string} token
 * @param {object} [options]
 */
export function createSessionCookie(name, token, options = {}) {
  return serializeCookie(name, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    ...options,
  });
}

/**
 * @param {string} name
 * @param {object} [options]
 */
export function clearSessionCookie(name, options = {}) {
  return clearCookie(name, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    ...options,
  });
}

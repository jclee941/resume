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

export function createSessionCookie(name, token, options = {}) {
  return serializeCookie(name, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    ...options,
  });
}

export function clearSessionCookie(name, options = {}) {
  return clearCookie(name, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    ...options,
  });
}

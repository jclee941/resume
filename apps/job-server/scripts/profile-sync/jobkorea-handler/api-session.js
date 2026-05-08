import { buildCookieString } from '../../jobkorea-session/cookie-utils.js';
import { loadJobKoreaSession, saveJobKoreaSession } from './session.js';

function parseCookieString(cookieString) {
  if (!cookieString || typeof cookieString !== 'string') {
    return [];
  }

  return cookieString
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && part.includes('='))
    .map((part) => {
      const [name, ...value] = part.split('=');
      return {
        name: name.trim(),
        value: value.join('=').trim(),
        domain: '.jobkorea.co.kr',
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      };
    });
}

export function createAPISession(cookieString = '') {
  return {
    cookieString,
    getCookieHeader() {
      return this.cookieString;
    },
  };
}

export function loadJobKoreaAPISession() {
  const cookies = loadJobKoreaSession();
  if (!cookies || cookies.length === 0) {
    return '';
  }

  return buildCookieString(cookies);
}

export function saveJobKoreaAPISession(cookieString) {
  const cookies = parseCookieString(cookieString);
  saveJobKoreaSession(cookies);
  return cookies.length > 0;
}

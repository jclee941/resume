function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const WANTED_AUTH_COOKIE_NAMES = new Set(['WWW_ONEID_ACCESS_TOKEN', 'ONEID_SESSION']);
const JWT_EXPIRY_SKEW_MS = 60_000;
const BASE64URL_SEGMENT = /^[A-Za-z0-9_-]+$/;

function parseCookieString(cookieString) {
  if (!hasValue(cookieString)) return [];

  return cookieString
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.includes('='))
    .map((cookie) => {
      const separator = cookie.indexOf('=');
      return {
        name: cookie.slice(0, separator).trim(),
        value: cookie.slice(separator + 1).trim(),
      };
    });
}

function getCookies(session) {
  const cookies = Array.isArray(session.cookies) ? session.cookies : parseCookieString(session.cookies);
  return [...cookies, ...parseCookieString(session.cookieString)].filter(
    (cookie) =>
      cookie !== null &&
      typeof cookie === 'object' &&
      hasValue(cookie.name) &&
      typeof cookie.value === 'string'
  );
}

function decode(value) {
  if (typeof value !== 'string') return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizedName(cookie) {
  return decode(cookie.name).toUpperCase();
}

function hasValidJkat(value) {
  if (!hasValue(value)) return false;
  const segments = value.split('.');
  if (segments.length !== 3 || segments.some((segment) => !BASE64URL_SEGMENT.test(segment))) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
    return (
      payload !== null &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      typeof payload.exp === 'number' &&
      Number.isFinite(payload.exp) &&
      payload.exp * 1000 >= Date.now() + JWT_EXPIRY_SKEW_MS
    );
  } catch {
    return false;
  }
}

function validateEmptyCriticalCookie(cookies) {
  for (const cookie of cookies) {
    if (
      !hasValue(cookie.value) &&
      ['uid', 'user'].includes(String(cookie.name).toLowerCase())
    ) {
      return { valid: false, reason: `empty_${cookie.name}` };
    }
  }
  return null;
}

function validateJobKoreaSession(session, cookies) {
  let authenticated = hasValue(session.token);

  for (const cookie of cookies) {
    const name = normalizedName(cookie);
    const value = decode(cookie.value);

    if (name === 'NET_SESSIONID' && hasValue(value)) authenticated = true;
    if (name === 'JKAT' && hasValidJkat(value)) authenticated = true;

    if (name === 'JK_USER') {
      const memberId = value.match(/(?:^|&)M_ID=([^&]*)/);
      if (memberId && hasValue(memberId[1])) authenticated = true;
    }

    if (name === 'USER' || name === 'C_USER') {
      const userId = value.match(/(?:^|&)UID=([^&]*)/);
      if (userId && !hasValue(userId[1])) {
        return {
          valid: false,
          reason: name === 'USER' ? 'empty_jobkorea_uid' : 'empty_jobkorea_cuser_uid',
        };
      }
      if (userId && hasValue(userId[1])) authenticated = true;
    }
  }

  return authenticated ? null : { valid: false, reason: 'no_jobkorea_auth' };
}

function validateWantedSession(session, cookies) {
  const authenticated =
    hasValue(session.token) ||
    cookies.some(
      (cookie) => WANTED_AUTH_COOKIE_NAMES.has(normalizedName(cookie)) && hasValue(cookie.value)
    );
  return authenticated ? null : { valid: false, reason: 'no_wanted_cookies' };
}

function validateSaraminSession(session, cookies) {
  const authenticated =
    hasValue(session.token) ||
    cookies.some(
      (cookie) =>
        ['PHPSESSID', '_SARAMIN_SESSION'].includes(normalizedName(cookie)) &&
        hasValue(cookie.value)
    );
  return authenticated ? null : { valid: false, reason: 'no_saramin_auth' };
}

export const sessionContentValidationMethods = {
  validateSessionContent(platform, session) {
    const cookies = getCookies(session);
    const emptyCriticalCookie = validateEmptyCriticalCookie(cookies);
    if (emptyCriticalCookie) return emptyCriticalCookie;

    let validation = null;
    if (platform === 'wanted') validation = validateWantedSession(session, cookies);
    if (platform === 'jobkorea') validation = validateJobKoreaSession(session, cookies);
    if (platform === 'saramin') validation = validateSaraminSession(session, cookies);

    return validation ?? { valid: true, reason: null };
  },
};

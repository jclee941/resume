function hasEmptyCriticalCookie(cookie) {
  const [name, ...valueParts] = cookie.split('=');
  const value = valueParts.join('=').trim();

  return (
    name &&
    value === '' &&
    ['UID', 'User'].some((critical) =>
      name.toLowerCase() === critical.toLowerCase()
    )
  );
}

function validateCookieString(cookieString) {
  const cookies = cookieString.split(';').map((c) => c.trim());

  for (const cookie of cookies) {
    if (hasEmptyCriticalCookie(cookie)) {
      const [name] = cookie.split('=');
      return { valid: false, reason: `empty_${name}` };
    }
  }

  return null;
}

function validateJobKoreaCookies(cookies) {
  const userCookie = cookies.find((c) => c.name === 'User');
  const cUserCookie = cookies.find((c) => c.name === 'C%5FUSER' || c.name === 'C_USER');
  const jkUserCookie = cookies.find((c) => c.name === 'JK%5FUser' || c.name === 'JK_User');

  // Modern JobKorea sessions use JK_User instead of User. If JK_User has a
  // valid member ID, the session is authenticated regardless of User cookie.
  if (jkUserCookie) {
    const decodedValue = decodeURIComponent(jkUserCookie.value);
    if (decodedValue.includes('M%5FID=') || decodedValue.includes('M_ID=')) {
      const midMatch = decodedValue.match(/M[_%5F]ID=([^&]+)/);
      if (midMatch && midMatch[1]) {
        return null;
      }
    }
  }

  if (userCookie) {
    const decodedValue = decodeURIComponent(userCookie.value);
    if (decodedValue.includes('UID=&') || decodedValue.includes('UID=')) {
      const uidMatch = decodedValue.match(/UID=([^&]*)/);
      if (!uidMatch || !uidMatch[1]) {
        return { valid: false, reason: 'empty_jobkorea_uid' };
      }
    }
  }

  if (cUserCookie) {
    const decodedValue = decodeURIComponent(cUserCookie.value);
    if (decodedValue.includes('UID=&') || decodedValue === 'UID=') {
      return { valid: false, reason: 'empty_jobkorea_cuser_uid' };
    }
  }

  return null;
}

function validateWantedSession(session) {
  if (!session.cookieString && !session.cookies) {
    return { valid: false, reason: 'no_wanted_cookies' };
  }

  if (session.cookieString && !session.cookieString.includes('ONEID')) {
    console.warn('[SessionManager] Wanted session missing ONEID token');
  }

  return null;
}

export const sessionContentValidationMethods = {
  validateSessionContent(platform, session) {
    if (session.cookieString) {
      const cookieStringValidation = validateCookieString(session.cookieString);
      if (cookieStringValidation) return cookieStringValidation;
    }

    if (platform === 'jobkorea' && session.cookies) {
      const jobKoreaValidation = validateJobKoreaCookies(session.cookies);
      if (jobKoreaValidation) return jobKoreaValidation;
    }

    if (platform === 'wanted') {
      const wantedValidation = validateWantedSession(session);
      if (wantedValidation) return wantedValidation;
    }

    return { valid: true, reason: null };
  },
};

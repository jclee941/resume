export function toCookieString(cookies) {
  if (typeof cookies === 'string') {
    return cookies;
  }

  if (Array.isArray(cookies)) {
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }

  return String(cookies);
}

export function countCookies(cookieString, cookies) {
  if (Array.isArray(cookies)) {
    return cookies.length;
  }

  return cookieString.split(';').filter(Boolean).length;
}

export function buildUser(profile) {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
  };
}

export function hasProfileIdentity(profile) {
  return Boolean(profile && (profile.id || profile.email || profile.name));
}

export function sessionExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

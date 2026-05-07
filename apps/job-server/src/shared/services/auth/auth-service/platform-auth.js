/**
 * Get platform authentication status.
 * @param {import('./auth-typedefs.js').PlatformSessionStore} sessionStore
 * @returns {{success: boolean, status: Object}}
 */
export function getAuthStatus(sessionStore) {
  const status = sessionStore.getStatus();
  return { success: true, status };
}

/**
 * Save platform authentication cookies.
 * @param {import('./auth-typedefs.js').PlatformSessionStore} sessionStore
 * @param {string} platform
 * @param {string|Array<{name: string, value: string}>|unknown} cookies
 * @param {string} [email]
 * @returns {{success: boolean, message?: string, error?: string, statusCode?: number}}
 */
export function savePlatformAuth(sessionStore, platform, cookies, email) {
  if (!platform || !cookies) {
    return {
      success: false,
      error: 'Platform and cookies required',
      statusCode: 400,
    };
  }

  const cookieString = normalizeCookieString(cookies);
  const cookieCount = Array.isArray(cookies)
    ? cookies.length
    : cookieString.split(';').filter(Boolean).length;
  sessionStore.save(platform, {
    cookies,
    cookieString,
    cookieCount,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    email,
  });
  return { success: true, message: `Auth saved for ${platform}` };
}

/**
 * Clear platform authentication.
 * @param {import('./auth-typedefs.js').PlatformSessionStore} sessionStore
 * @param {string} platform
 * @returns {{success: boolean, message: string}}
 */
export function clearPlatformAuth(sessionStore, platform) {
  sessionStore.clear(platform);
  return { success: true, message: `Logged out from ${platform}` };
}

/**
 * @param {string|Array<{name: string, value: string}>|unknown} cookies
 * @returns {string}
 */
function normalizeCookieString(cookies) {
  if (typeof cookies === 'string') return cookies;
  if (Array.isArray(cookies)) {
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }
  return String(cookies);
}

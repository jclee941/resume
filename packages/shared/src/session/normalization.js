import { calculateExpiresAt, getSessionTtlMs } from './constants.js';
import { cookieArrayToString, countCookieString } from './cookies.js';

/**
 * Normalize persisted job-platform session shape without changing file format.
 * @param {string} platform
 * @param {object} data
 * @param {object} [options]
 * @returns {object}
 */
export function normalizePlatformSession(platform, data, options = {}) {
  const now = options.now ?? Date.now();
  const getTtlMs = options.getTtlMs || getSessionTtlMs;
  const normalized = { ...data, platform };

  if (typeof normalized.cookies === 'string') {
    if (!normalized.cookieString) normalized.cookieString = normalized.cookies;
    normalized.cookies = null;
  }

  if (Array.isArray(normalized.cookies) && !normalized.cookieString) {
    normalized.cookieString = cookieArrayToString(normalized.cookies);
  }

  if (normalized.cookieCount == null) {
    if (Array.isArray(normalized.cookies)) {
      normalized.cookieCount = normalized.cookies.length;
    } else if (normalized.cookieString) {
      normalized.cookieCount = countCookieString(normalized.cookieString);
    } else {
      normalized.cookieCount = 0;
    }
  }

  if (!normalized.expiresAt) {
    normalized.expiresAt = calculateExpiresAt(getTtlMs(platform), now);
  }

  return { ...normalized, timestamp: now };
}

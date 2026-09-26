import { calculateExpiresAt, getSessionTtlMs } from './constants.js';
import { cookieArrayToString, countCookieString } from './cookies.js';

/**
 * @typedef {Object} SessionData
 * @property {string | Array<{ name: string, value: string }> | null} [cookies]
 * @property {string | null} [cookieString]
 * @property {number | null} [cookieCount]
 * @property {number | string | null} [expiresAt]
 * @property {number} [timestamp]
 * @property {string} [platform]
 */

/**
 * @typedef {Object} NormalizeSessionOptions
 * @property {number} [now]
 * @property {(platform: string) => number} [getTtlMs]
 */

/**
 * Normalize persisted job-platform session shape without changing file format.
 * @param {string} platform
 * @param {SessionData & Record<string, unknown>} data
 * @param {NormalizeSessionOptions} [options]
 * @returns {SessionData & Record<string, unknown>}
 */
export function normalizePlatformSession(platform, data, options = {}) {
  const now = options.now ?? Date.now();
  const getTtlMs = options.getTtlMs || getSessionTtlMs;
  /** @type {SessionData & Record<string, unknown> & { platform: string }} */
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

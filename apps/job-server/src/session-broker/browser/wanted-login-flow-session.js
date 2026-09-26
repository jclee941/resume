import { EncryptionService } from '@resume/shared/crypto';
import {
  WANTED_PROFILE_API_URL,
  DEFAULT_BACKOFF_MS,
  WANTED_LOGIN_ERRORS,
  createSessionError,
  isTimeoutError,
  isWafBlocked,
  isCaptchaDetected,
  cookiesToHeader,
  maskEmail,
  readJsonSafely,
} from './wanted-login-flow-helpers.js';

/**
 * @typedef {{
 *   name: string;
 *   value: string;
 *   [key: string]: unknown;
 * }} CookieItem
 */

/**
 * @typedef {{
 *   id?: string | number | null;
 *   email?: string | null;
 *   name?: string | null;
 *   [key: string]: unknown;
 * }} WantedUserData
 */

/**
 * @typedef {{
 *   message?: string;
 *   error?: string;
 *   data?: WantedUserData;
 *   id?: string | number | null;
 *   email?: string | null;
 *   name?: string | null;
 *   [key: string]: unknown;
 * }} WantedResponseBody
 */

/**
 * @param {{ SESSION_ENCRYPTION_KEY?: string } | null | undefined} env
 * @param {EncryptionService | null | undefined} [provided]
 * @returns {EncryptionService | null}
 */
export function createOptionalEncryptionService(env, provided) {
  if (provided) return provided;
  if (!env?.SESSION_ENCRYPTION_KEY) return null;
  return new EncryptionService({ key: env.SESSION_ENCRYPTION_KEY });
}

/**
 * @param {import('./wanted-login-flow-helpers.js').SessionError} error
 * @returns {import('./wanted-login-flow-helpers.js').SessionError}
 */
export function normalizeWantedError(error) {
  if (error?.code) return error;
  if (isTimeoutError(error))
    return createSessionError(WANTED_LOGIN_ERRORS.TIMEOUT, error.message, error);
  if (isCaptchaDetected(null, error))
    return createSessionError(WANTED_LOGIN_ERRORS.CAPTCHA_DETECTED, error.message, error);
  if (isWafBlocked(null, error))
    return createSessionError(WANTED_LOGIN_ERRORS.WAF_BLOCKED, error.message, error);
  return createSessionError(
    WANTED_LOGIN_ERRORS.LOGIN_FAILED,
    error?.message || 'Wanted login failed',
    error
  );
}

/**
 * @param {import('./wanted-login-flow-helpers.js').SessionError | null | undefined} error
 * @returns {boolean}
 */
export function isWantedRetryableError(error) {
  return (
    error?.code === WANTED_LOGIN_ERRORS.WAF_BLOCKED || error?.code === WANTED_LOGIN_ERRORS.TIMEOUT
  );
}

/**
 * @param {number} attempt
 * @param {() => number} [random]
 * @returns {number}
 */
export function calculateWantedBackoff(attempt, random = Math.random) {
  return DEFAULT_BACKOFF_MS * 2 ** (attempt - 1) + Math.floor(random() * 250);
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {CookieItem[]} cookies
 * @param {string | null} [fallbackEmail]
 * @returns {Promise<{ user: { id: string | number | null; email: string | null | undefined; name: string | null } }>}
 */
export async function validateWantedSession(fetchImpl, cookies, fallbackEmail) {
  if (typeof fetchImpl !== 'function') {
    throw createSessionError(
      WANTED_LOGIN_ERRORS.LOGIN_FAILED,
      'Validation fetch implementation is unavailable'
    );
  }

  const cookieHeader = cookiesToHeader(cookies);
  const response = await fetchImpl(WANTED_PROFILE_API_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Cookie: cookieHeader,
      Origin: 'https://www.wanted.co.kr',
      Referer: 'https://www.wanted.co.kr/',
    },
  });

  const body = /** @type {WantedResponseBody | null} */ (await readJsonSafely(response));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      const wafError = body?.message || body?.error || '';
      if (isWafBlocked(null, { message: wafError })) {
        throw createSessionError(
          WANTED_LOGIN_ERRORS.WAF_BLOCKED,
          'Wanted session validation hit CloudFront challenge'
        );
      }
      throw createSessionError(
        WANTED_LOGIN_ERRORS.LOGIN_FAILED,
        'Wanted rejected authenticated profile request'
      );
    }
    throw createSessionError(
      WANTED_LOGIN_ERRORS.LOGIN_FAILED,
      `Wanted session validation failed with status ${response.status}`
    );
  }

  const user = body?.data || body || {};
  if (!user.id && !user.email && !user.name) {
    throw createSessionError(
      WANTED_LOGIN_ERRORS.LOGIN_FAILED,
      'Wanted session validation did not return profile data'
    );
  }

  return {
    user: {
      id: user.id ?? null,
      email: user.email ?? fallbackEmail,
      name: user.name ?? null,
    },
  };
}

/**
 * @param {{
 *   encryptionService?: EncryptionService | null;
 *   cookies: CookieItem[];
 *   email?: string | null;
 *   user: { id?: string | number | null; email?: string | null; name?: string | null };
 *   attempt: number;
 * }} params
 * @returns {{ storage: Record<string, unknown>; result: Record<string, unknown> }}
 */
export function buildWantedSessionData({ encryptionService, cookies, email, user, attempt }) {
  const cookieString = cookiesToHeader(cookies);
  const encryptedSession =
    encryptionService?.encrypt({
      platform: 'wanted',
      cookieString,
      email: user.email ?? email,
    }) ?? null;

  const storage = {
    token: null,
    email: user.email ?? email,
    cookies,
    cookieString,
    cookieCount: cookies.length,
    encryptedSession,
    authSource: 'cloak-browser',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  return {
    storage,
    result: {
      platform: 'wanted',
      authenticated: true,
      authSource: 'cloak-browser',
      email: user.email ?? email,
      maskedEmail: maskEmail(user.email ?? email),
      user,
      cookies,
      cookieString,
      cookieCount: cookies.length,
      encryptedSession,
      validation: 'profile-api',
      attempt,
    },
  };
}

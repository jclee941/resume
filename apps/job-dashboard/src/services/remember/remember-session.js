/**
 * @fileoverview Remember login for the Worker, stored like the other platforms as an encrypted
 * KV session (`auth:remember`). The web login (POST rememberapp.co.kr/auths/login) needs the
 * `_remember_device_id` cookie and answers with a `remember_shared_data` cookie; the career API
 * decrypts that cookie into the session token the APIs take. Plain fetch, no browser.
 * @module services/remember/remember-session
 */
import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { readPlatformSession, writePlatformSession } from '../platform-session.js';
import {
  REMEMBER_CAREER_API_URL,
  REMEMBER_WEB_URL,
  RememberApiError,
  rememberRequest,
} from './remember-api.js';
import { rememberFetch } from './remember-fetch.js';

export const AUTH_REMEMBER_KEY = 'auth:remember';
export const REMEMBER_SESSION_TTL_S = 60 * 60 * 24 * 12;
const SHARED_DATA_COOKIE = 'remember_shared_data';

/**
 * @typedef {{
 *   REMEMBER_EMAIL?: string;
 *   REMEMBER_PASSWORD?: string;
 *   REMEMBER_DEVICE_ID?: string;
 *   SESSIONS: { get: Function; put: Function };
 *   ENCRYPTION_KEY?: string;
 *   MYBROWSER?: unknown;
 *   BROWSER_SESSION?: unknown;
 *   [key: string]: unknown;
 * }} RememberEnv
 */

/**
 * @param {RememberEnv} env
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<string>} the session token
 */
export async function mintRememberToken(env, { fetchImpl = rememberFetch(env) } = {}) {
  const { REMEMBER_EMAIL: email, REMEMBER_PASSWORD: password, REMEMBER_DEVICE_ID: deviceId } = env;
  if (!email || !password || !deviceId) {
    throw new Error('REMEMBER_EMAIL, REMEMBER_PASSWORD and REMEMBER_DEVICE_ID are required');
  }
  const response = await fetchImpl(`${REMEMBER_WEB_URL}/auths/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': 'ko-KR',
      Package: 'kr.co.rememberapp',
      Origin: REMEMBER_WEB_URL,
      Referer: `${REMEMBER_WEB_URL}/onboarding/login/withEmail`,
      'User-Agent': DEFAULT_USER_AGENT,
      Cookie: `_remember_device_id=${deviceId}`,
    },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.code !== 'ok') {
    const detail = payload?.message ? `: ${payload.message}` : '';
    throw new Error(`Remember login failed (${response.status} ${payload?.code ?? ''})${detail}`);
  }
  const sharedData = readSetCookie(response.headers, SHARED_DATA_COOKIE);
  if (!sharedData) throw new Error('Remember login returned no remember_shared_data cookie');
  const decrypted = await rememberRequest(null, `${REMEMBER_CAREER_API_URL}/shared_data/decrypt`, {
    method: 'POST',
    body: { encrypted_data: sharedData },
    fetchImpl,
  });
  const token = decrypted?.data?.token;
  if (typeof token !== 'string' || !token) {
    throw new Error('Remember shared data decrypt returned no token');
  }
  return token;
}

/**
 * Mint a Remember session and store it encrypted in KV. Never throws.
 * @param {RememberEnv} env
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<{ ok: true; key: string; length: number } | { ok: false; error: string }>}
 */
export async function refreshRememberSession(env, opts = {}) {
  try {
    const token = await mintRememberToken(env, { fetchImpl: opts.fetchImpl ?? rememberFetch(env) });
    await writePlatformSession(env, 'remember', token, REMEMBER_SESSION_TTL_S);
    return { ok: true, key: AUTH_REMEMBER_KEY, length: token.length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Run `fn` with the stored session token, logging in again when KV has none or Remember
 * answers 401 for the stored one.
 * @template T
 * @param {RememberEnv} env
 * @param {(token: string, fetchImpl: typeof fetch) => Promise<T>} fn
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<T>}
 */
export async function withRememberToken(env, fn, opts = {}) {
  const fetchImpl = opts.fetchImpl ?? rememberFetch(env);
  const stored = await readPlatformSession(env, 'remember');
  if (stored) {
    try {
      return await fn(stored, fetchImpl);
    } catch (error) {
      if (!(error instanceof RememberApiError && error.status === 401)) throw error;
    }
  }
  const refreshed = await refreshRememberSession(env, { fetchImpl });
  if (!refreshed.ok) throw new Error(`Remember session refresh failed: ${refreshed.error}`);
  const minted = await readPlatformSession(env, 'remember');
  if (!minted) throw new Error('No Remember session after refresh');
  return fn(minted, fetchImpl);
}

/**
 * @param {Headers} headers
 * @param {string} name
 * @returns {string | null}
 */
function readSetCookie(headers, name) {
  const cookies =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : [headers.get('set-cookie') ?? ''];
  for (const cookie of cookies) {
    const pair = cookie.split(';')[0].trim();
    if (pair.startsWith(`${name}=`)) return decodeURIComponent(pair.slice(name.length + 1));
  }
  return null;
}

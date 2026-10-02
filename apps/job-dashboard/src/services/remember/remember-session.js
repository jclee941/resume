/**
 * @fileoverview Remember login for the Worker, stored like the other platforms as an encrypted
 * KV session (`auth:remember`). The web login (POST rememberapp.co.kr/auths/login) needs the
 * `_remember_device_id` cookie and answers with the session token in its body
 * (`data.device.token`), which the career APIs take as `Authorization: Token token=<token>`. The
 * request runs through `rememberFetch` (Browser Rendering REST), since Remember's WAF blocks
 * Cloudflare egress.
 * @module services/remember/remember-session
 */
import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { readPlatformSession, writePlatformSession } from '../platform-session.js';
import { REMEMBER_WEB_URL, RememberApiError } from './remember-api.js';
import { rememberFetch } from './remember-fetch.js';

export const AUTH_REMEMBER_KEY = 'auth:remember';
export const REMEMBER_SESSION_TTL_S = 60 * 60 * 24 * 12;

/**
 * @typedef {{
 *   REMEMBER_EMAIL?: string;
 *   REMEMBER_PASSWORD?: string;
 *   REMEMBER_DEVICE_ID?: string;
 *   SESSIONS: { get: Function; put: Function };
 *   ENCRYPTION_KEY?: string;
 *   REMEMBER_BROWSER_ACCOUNT_ID?: string;
 *   REMEMBER_BROWSER_API_TOKEN?: string;
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
  const token = payload?.data?.device?.token;
  if (typeof token !== 'string' || !token) {
    throw new Error('Remember login returned no token');
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
      if (!needsRelogin(error)) throw error;
    }
  }
  const refreshed = await refreshRememberSession(env, { fetchImpl });
  if (!refreshed.ok) throw new Error(`Remember session refresh failed: ${refreshed.error}`);
  const minted = await readPlatformSession(env, 'remember');
  if (!minted) throw new Error('No Remember session after refresh');
  return fn(minted, fetchImpl);
}

/**
 * Whether an error means the stored token is no longer valid, so a fresh login should be tried.
 * Remember answers an expired token with HTTP 200 and `code: "require_authorize"`, not 401.
 * @param {unknown} error
 * @returns {boolean}
 */
function needsRelogin(error) {
  if (!(error instanceof RememberApiError)) return false;
  if (error.status === 401) return true;
  const body = /** @type {{ code?: unknown } | null} */ (error.body);
  const code = body && typeof body === 'object' ? body.code : undefined;
  return code === 'require_authorize' || code === 'unauthorized';
}

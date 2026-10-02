/**
 * @fileoverview Remember (rememberapp.co.kr) HTTP surface the Worker uses, reverse-engineered
 * from the career, profile and web bundles on 2026-10-02. Every authenticated call sends
 * `Authorization: Token token=<session token>`; see ./remember-session.js for the login.
 * @module services/remember/remember-api
 */
import { DEFAULT_USER_AGENT } from '@resume/shared/ua';

export const REMEMBER_WEB_URL = 'https://rememberapp.co.kr';
export const REMEMBER_API_URL = 'https://api.rememberapp.co.kr/v2';
export const REMEMBER_CAREER_API_URL = 'https://career-api.rememberapp.co.kr';
export const REMEMBER_PROFILE_API_URL = 'https://open-profile-api.rememberapp.co.kr';
export const REMEMBER_CAREER_URL = 'https://career.rememberapp.co.kr';

export class RememberApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {unknown} body
   */
  constructor(message, status, body) {
    super(message);
    this.name = 'RememberApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * @typedef {{
 *   method?: string;
 *   body?: unknown;
 *   fetchImpl?: typeof fetch;
 * }} RememberRequestOptions
 */

/**
 * JSON request against a Remember API host. A non-2xx status, or a body whose `code` is not
 * "ok" (the web and profile APIs answer 200 with `code: "invalid_params"` and the like), is a
 * RememberApiError carrying the status and the parsed body.
 * @param {string | null} token
 * @param {string} url
 * @param {RememberRequestOptions} [options]
 * @returns {Promise<any>}
 */
export async function rememberRequest(
  token,
  url,
  { method = 'GET', body, fetchImpl = fetch } = {}
) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      Accept: 'application/json',
      'User-Agent': DEFAULT_USER_AGENT,
      Origin: REMEMBER_CAREER_URL,
      Referer: `${REMEMBER_CAREER_URL}/`,
      ...(token ? { Authorization: `Token token=${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const payload = parseJson(text);
  const code = payload && typeof payload === 'object' ? payload.code : undefined;
  if (!response.ok || (typeof code === 'string' && code !== 'ok')) {
    const path = new URL(url).pathname;
    throw new RememberApiError(
      `Remember ${method} ${path} failed (${response.status}${code ? ` ${code}` : ''})`,
      response.status,
      payload ?? text.slice(0, 300)
    );
  }
  return payload;
}

/**
 * @param {string} text
 * @returns {any}
 */
function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

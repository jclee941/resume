/**
 * @fileoverview SK Careers (skcareers.com) over plain fetch: the email and password login, and
 * the MyPage resume editor, which renders the account's one saved resume as `form1` and saves
 * the whole form through POST /Mypage/ResumeSave. The site is reachable from Cloudflare egress.
 * @module services/skcareers/skcareers-api
 */
import { DEFAULT_USER_AGENT } from '@resume/shared/ua';

export const SKCAREERS_URL = 'https://www.skcareers.com';
const SESSION_COOKIE = 'SKRecruitProtal_SKLive';
const FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded; charset=UTF-8';

/**
 * @typedef {{ SKCAREERS_EMAIL?: string; SKCAREERS_PASSWORD?: string; [key: string]: unknown }} SkCareersEnv
 * @typedef {{ fetchImpl?: typeof fetch }} SkCareersRequestOptions
 * @typedef {{ success?: boolean; msg?: string } | null} SkCareersReply
 */

/**
 * Log in and return the session cookie pair the other requests send.
 * @param {SkCareersEnv} env
 * @param {SkCareersRequestOptions} [options]
 * @returns {Promise<string>}
 */
export async function loginSkCareers(env, { fetchImpl = fetch } = {}) {
  const { SKCAREERS_EMAIL: email, SKCAREERS_PASSWORD: password } = env;
  if (!email || !password) {
    throw new Error('SKCAREERS_EMAIL and SKCAREERS_PASSWORD are required');
  }
  const response = await fetchImpl(`${SKCAREERS_URL}/User/Login`, {
    method: 'POST',
    headers: ajaxHeaders('/User/Login'),
    body: new URLSearchParams({ email, password, returnUrl: '/MyPage/Resume' }).toString(),
    redirect: 'manual',
  });
  /** @type {SkCareersReply} */
  const reply = await response.json().catch(() => null);
  const cookie = sessionCookie(response.headers);
  if (!response.ok || reply?.success !== true || !cookie) {
    throw new Error(`SK Careers login failed (${response.status})${replyMessage(reply)}`);
  }
  return cookie;
}

/**
 * The resume editor page: the saved resume, or an empty form before the first save.
 * @param {string} cookie
 * @param {SkCareersRequestOptions} [options]
 * @returns {Promise<string>}
 */
export async function readResumeEditor(cookie, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${SKCAREERS_URL}/Mypage/ResumeCreate`, {
    headers: { Cookie: cookie, 'User-Agent': DEFAULT_USER_AGENT },
    redirect: 'manual',
  });
  if (response.status !== 200) {
    const location = response.headers.get('location');
    throw new Error(
      `SK Careers resume editor answered ${response.status}${location ? ` (to ${location})` : ''}`
    );
  }
  return response.text();
}

/**
 * Save the whole resume form, already encoded as the site's `p` parameter.
 * @param {string} cookie
 * @param {string} param
 * @param {SkCareersRequestOptions} [options]
 * @returns {Promise<void>}
 */
export async function saveResume(cookie, param, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${SKCAREERS_URL}/Mypage/ResumeSave`, {
    method: 'POST',
    headers: { ...ajaxHeaders('/Mypage/ResumeCreate'), Cookie: cookie },
    body: new URLSearchParams({ p: param }).toString(),
    redirect: 'manual',
  });
  /** @type {SkCareersReply} */
  const reply = await response.json().catch(() => null);
  if (!response.ok || reply?.success !== true) {
    throw new Error(`SK Careers resume save failed (${response.status})${replyMessage(reply)}`);
  }
}

/**
 * Headers of the page's jQuery $.post calls.
 * @param {string} refererPath
 * @returns {Record<string, string>}
 */
function ajaxHeaders(refererPath) {
  return {
    'Content-Type': FORM_CONTENT_TYPE,
    'X-Requested-With': 'XMLHttpRequest',
    Origin: SKCAREERS_URL,
    Referer: `${SKCAREERS_URL}${refererPath}`,
    'User-Agent': DEFAULT_USER_AGENT,
  };
}

/**
 * @param {Headers} headers
 * @returns {string | null} `name=value` of the session cookie
 */
function sessionCookie(headers) {
  const cookies =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : [headers.get('set-cookie') ?? ''];
  const pair = cookies
    .map((cookie) => cookie.split(';')[0].trim())
    .find((candidate) => candidate.startsWith(`${SESSION_COOKIE}=`));
  return pair && pair.length > SESSION_COOKIE.length + 1 ? pair : null;
}

/**
 * The site's `msg` (HTML) as plain text.
 * @param {SkCareersReply} reply
 * @returns {string}
 */
function replyMessage(reply) {
  const text = String(reply?.msg ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? `: ${text}` : '';
}

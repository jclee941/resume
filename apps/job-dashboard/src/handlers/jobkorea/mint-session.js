/**
 * @fileoverview Mints a JobKorea session cookie (email/password login +
 * CAPTCHA solve via the cliproxy vision proxy) and stores it in KV as
 * `auth:jobkorea` — analogous to handlers/wanted/mint-session.js, but driven
 * through the CF Browser Rendering broker (Wave 3) since JobKorea has no
 * public token endpoint. Page automation lives in ./page-helpers.js; this
 * module owns the cliproxy CAPTCHA-vision call and login orchestration.
 * Ported from apps/job-server/scripts/jobkorea-session and
 * apps/job-server/scripts/profile-sync/jobkorea-handler/captcha-{solver,vision-client}.js.
 * @module handlers/jobkorea/mint-session
 */

import { withBrowserSession as defaultWithBrowserSession } from '../browser/browser-service.js';
import {
  SUBMIT_SELECTOR,
  CAPTCHA_SUBMIT_SELECTOR,
  fillLoginForm,
  submitAndWait,
  isLoggedIn,
  detectCaptcha,
  findCaptchaImageUrl,
  downloadCaptchaImage,
  fillCaptchaInput,
  collectJobKoreaCookies,
} from './page-helpers.js';

export const AUTH_JOBKOREA_KEY = 'auth:jobkorea';
export const JOBKOREA_LOGIN_URL = 'https://www.jobkorea.co.kr/Login/Login.asp';
export const JOBKOREA_SESSION_TTL_S = 60 * 60 * 6; // 6h

const DEFAULT_CAPTCHA_MODEL = 'gpt-5.5';
const CAPTCHA_VISION_PROMPT =
  'The image contains a short distorted string of letters and digits. ' +
  'Transcribe exactly the characters you see in the image, preserving upper/lower case. ' +
  'It is usually 5 to 8 characters long and contains no real words. ' +
  'Do NOT guess, do NOT output any word that is not literally drawn in the image. ' +
  'Reply with ONLY those characters — no spaces, no punctuation, no explanation. ' +
  'The answer must not be a normal word like image, captcha, letters, or text. ' +
  'If the characters are illegible, reply with exactly: ZZZZZZ.';

const LOGIN_POLL_ATTEMPTS = 5;
const LOGIN_POLL_INTERVAL_MS = 1000; // ~5s worst case across LOGIN_POLL_ATTEMPTS

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ask the configured cliproxy vision model to transcribe a JobKorea CAPTCHA
 * image.
 * @param {{CLIPROXY_BASE?: string, CLIPROXY_API_KEY?: string, CLIPROXY_MODEL?: string}} env
 * @param {{mime: string, base64: string}} image
 * @param {{fetchImpl?: typeof fetch}} [opts]
 * @returns {Promise<string>} the trimmed CAPTCHA answer
 */
export async function solveJobKoreaCaptcha(env, { mime, base64 }, { fetchImpl = fetch } = {}) {
  const base = env?.CLIPROXY_BASE;
  const apiKey = env?.CLIPROXY_API_KEY;
  if (!base) throw new Error('CLIPROXY_BASE is required to solve the JobKorea CAPTCHA');
  if (!apiKey) throw new Error('CLIPROXY_API_KEY is required to solve the JobKorea CAPTCHA');
  const model = env?.CLIPROXY_MODEL || DEFAULT_CAPTCHA_MODEL;

  const response = await fetchImpl(`${String(base).replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: CAPTCHA_VISION_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}`, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 32,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`cliproxy CAPTCHA solve failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('cliproxy CAPTCHA response did not include usable content');
  }
  return content.trim();
}

/**
 * Mint a fresh JobKorea session cookie by logging in through the Browser
 * Rendering broker, solving the CAPTCHA (if presented) via cliproxy vision.
 * @param {object} env
 * @param {{withBrowserSession?: Function, fetchImpl?: typeof fetch}} [opts]
 * @returns {Promise<string>} cookie string `name=value; name2=value2`
 */
export async function mintJobKoreaSession(
  env,
  { withBrowserSession = defaultWithBrowserSession, fetchImpl = fetch } = {}
) {
  const email = env?.JOBKOREA_USERNAME || env?.JOBKOREA_EMAIL;
  const password = env?.JOBKOREA_PASSWORD;
  if (!email) throw new Error('JOBKOREA_USERNAME (or JOBKOREA_EMAIL) is required to mint a JobKorea session');
  if (!password) throw new Error('JOBKOREA_PASSWORD is required to mint a JobKorea session');

  return withBrowserSession(env, async (browser) => {
    const page = await browser.newPage();
    try {
      await page.goto(JOBKOREA_LOGIN_URL, { waitUntil: 'domcontentloaded' });
      await fillLoginForm(page, { email, password });
      await submitAndWait(page, SUBMIT_SELECTOR);

      let loggedIn = await isLoggedIn(page);
      let attempt = 0;
      while (!loggedIn && attempt < LOGIN_POLL_ATTEMPTS) {
        attempt++;
        if (await detectCaptcha(page)) {
          const imageUrl = await findCaptchaImageUrl(page);
          if (!imageUrl) throw new Error('JobKorea CAPTCHA detected but no CAPTCHA image URL was found');
          const image = await downloadCaptchaImage(page, imageUrl);
          const answer = await solveJobKoreaCaptcha(env, image, { fetchImpl });
          await fillCaptchaInput(page, answer);
          await submitAndWait(page, CAPTCHA_SUBMIT_SELECTOR, { required: false });
        }
        await sleep(LOGIN_POLL_INTERVAL_MS);
        loggedIn = await isLoggedIn(page);
      }

      if (!loggedIn) {
        const url = typeof page.url === 'function' ? page.url() : JOBKOREA_LOGIN_URL;
        const title = await page.title().catch(() => '');
        throw new Error(`JobKorea login did not complete (url=${url}, title=${title})`);
      }

      const cookieString = await collectJobKoreaCookies(page, browser);
      if (!cookieString) throw new Error('JobKorea login succeeded but no session cookies were found');
      return cookieString;
    } finally {
      await page.close().catch(() => {});
    }
  });
}

/**
 * Mint a JobKorea session and store it in KV as `auth:jobkorea`. Never
 * throws — callers (admin route, scheduled cron) get a plain result back
 * either way.
 * @param {{SESSIONS: {put: Function}}} env
 * @param {{withBrowserSession?: Function, fetchImpl?: typeof fetch}} [opts]
 * @returns {Promise<{ok:true,key:string,length:number}|{ok:false,error:string}>}
 */
export async function refreshJobKoreaSession(env, opts = {}) {
  try {
    const cookie = await mintJobKoreaSession(env, opts);
    await env.SESSIONS.put(AUTH_JOBKOREA_KEY, cookie, { expirationTtl: JOBKOREA_SESSION_TTL_S });
    return { ok: true, key: AUTH_JOBKOREA_KEY, length: cookie.length };
  } catch (err) {
    return { ok: false, error: err?.message || String(err), ...(err?.code ? { code: err.code } : {}) };
  }
}

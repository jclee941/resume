/**
 * @fileoverview Admin-only live browser probe over the Cloudflare Browser
 * Rendering session broker (CF-native migration). Exercises the full Wave 2
 * path — BrowserSessionDO acquire -> puppeteer.connect(sessionId) -> newPage ->
 * goto -> inspect -> release — against REAL Browser Rendering.
 *
 * Doubles as the Wave 3 development harness: an admin can point it at any URL
 * (e.g. a JobKorea search/detail page) to observe live behaviour — final URL
 * after redirects, title, and a heuristic pageKind (content / login / captcha /
 * blocked) — before a crawler is wired through the broker.
 *
 * Route: GET /api/browser/smoke[?url=...] (admin-gated via ADMIN_ROUTES '/api/browser').
 * @module handlers/browser/smoke
 */

import { withBrowserSession as defaultWithBrowserSession } from './browser-service.js';

const DEFAULT_URL = 'https://example.com';

const LOGIN_MARKERS = ['login', 'signin', 'sign-in', '로그인', 'ログイン', 'auth'];
const CAPTCHA_MARKERS = ['captcha', '캡차', '자동입력 방지', '자동등록방지', 'recaptcha', 'hcaptcha', '보안문자'];
const BLOCKED_MARKERS = ['access denied', 'forbidden', '차단', 'blocked', 'unusual traffic', 'bot detected'];

/**
 * Classify a page from its final URL + title + a text sample.
 * @param {string} finalUrl
 * @param {string} title
 * @param {string} text
 * @returns {'content'|'login'|'captcha'|'blocked'}
 */
export function classifyPage(finalUrl, title, text) {
  const hay = `${finalUrl}\n${title}\n${text}`.toLowerCase();
  if (CAPTCHA_MARKERS.some((m) => hay.includes(m))) return 'captcha';
  if (BLOCKED_MARKERS.some((m) => hay.includes(m))) return 'blocked';
  if (LOGIN_MARKERS.some((m) => hay.includes(m))) return 'login';
  return 'content';
}

/**
 * Run the browser probe and return a plain result object (never throws).
 * @param {{BROWSER_SESSION: unknown, MYBROWSER: unknown}} env
 * @param {{withBrowserSession?: Function, url?: string, now?: () => number}} [opts]
 * @returns {Promise<object>}
 */
export async function runBrowserSmoke(env, opts = {}) {
  const {
    withBrowserSession = defaultWithBrowserSession,
    url = DEFAULT_URL,
    now = () => Date.now(),
  } = opts;
  const started = now();

  try {
    const data = await withBrowserSession(env, async (browser) => {
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const finalUrl = typeof page.url === 'function' ? page.url() : url;
        const title = await page.title();
        let text = '';
        try {
          text = await page.evaluate(() => (document.body?.innerText || '').slice(0, 1500));
        } catch {
          text = '';
        }
        let inputs = [];
        try {
          inputs = await page.evaluate(() =>
            Array.from(document.querySelectorAll('input')).slice(0, 25).map((el) => ({
              name: el.getAttribute('name') || '',
              type: el.getAttribute('type') || '',
              id: el.getAttribute('id') || '',
            }))
          );
        } catch {
          inputs = [];
        }
        return {
          finalUrl,
          title,
          pageKind: classifyPage(finalUrl, title, text),
          textSample: text.slice(0, 240),
          inputs,
        };
      } finally {
        try {
          await page.close();
        } catch {
          // best-effort — session teardown is handled by withBrowserSession
        }
      }
    });

    return { ok: true, url, ...data, elapsedMs: now() - started };
  } catch (err) {
    return {
      ok: false,
      url,
      error: err?.message || String(err),
      ...(err?.code ? { code: err.code } : {}),
      elapsedMs: now() - started,
    };
  }
}

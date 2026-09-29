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

import { withBrowserSession as defaultWithBrowserSession } from '../../services/browser-session.js';
import { readPlatformSession } from '../../services/platform-session.js';
import { toJobKoreaBrowserCookies } from '../../services/resume-platform-sync/jobkorea-editor.js';

/** Stored platform sessions a smoke probe may replay, and the host each belongs to. */
/** @type {Record<string, string>} */
const SMOKE_SESSION_HOSTS = { jobkorea: 'jobkorea.co.kr' };

/**
 * @typedef {{ name: string; value: string; domain: string; path: string }} SmokeCookie
 */

const DEFAULT_URL = 'https://example.com';

const LOGIN_MARKERS = ['login', 'signin', 'sign-in', '로그인', 'ログイン', 'auth'];
const CAPTCHA_MARKERS = [
  'captcha',
  '캡차',
  '자동입력 방지',
  '자동등록방지',
  'recaptcha',
  'hcaptcha',
  '보안문자',
];
const BLOCKED_MARKERS = [
  'access denied',
  'forbidden',
  '차단',
  'blocked',
  'unusual traffic',
  'bot detected',
];

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
 * @param {Parameters<typeof defaultWithBrowserSession>[0]} env
 * @param {{withBrowserSession?: typeof defaultWithBrowserSession, url?: string, cookies?: SmokeCookie[], screenshot?: boolean, now?: () => number}} [opts]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function runBrowserSmoke(env, opts = {}) {
  const {
    withBrowserSession = defaultWithBrowserSession,
    url = DEFAULT_URL,
    cookies = [],
    screenshot = false,
    now = () => Date.now(),
  } = opts;
  const started = now();

  try {
    const data = await withBrowserSession(env, async (browser) => {
      const page = await browser.newPage();
      try {
        if (cookies.length > 0) await page.setCookie(...cookies);
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const finalUrl = typeof page.url === 'function' ? page.url() : url;
        const title = await page.title();
        let text = '';
        try {
          text = await page.evaluate(() => (document.body?.innerText || '').slice(0, 1500));
        } catch {
          text = '';
        }
        /** @type {Array<{ name: string, type: string, id: string }>} */
        let inputs = [];
        try {
          inputs = await page.evaluate(() =>
            Array.from(document.querySelectorAll('input'))
              .slice(0, 25)
              .map((el) => ({
                name: el.getAttribute('name') || '',
                type: el.getAttribute('type') || '',
                id: el.getAttribute('id') || '',
              }))
          );
        } catch {
          inputs = [];
        }
        /** @type {{ scripts: string[]; photoImages: Array<{ className: string; src: string; width: number; height: number }> }} */
        let resources = { scripts: [], photoImages: [] };
        try {
          resources = await page.evaluate(() => {
            /** @param {string} value */
            const hostPath = (value) => {
              try {
                const parsed = new URL(value);
                return parsed.host + parsed.pathname;
              } catch {
                return '';
              }
            };
            return {
              scripts: Array.from(document.scripts)
                .map((script) => hostPath(script.src))
                .filter(Boolean)
                .slice(0, 40),
              photoImages: Array.from(document.querySelectorAll('img'))
                .filter((img) =>
                  /photo|picture|profile/i.test(`${img.getAttribute('src') || ''} ${img.className}`)
                )
                .slice(0, 10)
                .map((img) => ({
                  className: String(img.className),
                  src: hostPath(img.src),
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                })),
            };
          });
        } catch {
          resources = { scripts: [], photoImages: [] };
        }
        const image = screenshot
          ? await page.screenshot({ type: 'jpeg', quality: 60, encoding: 'base64' })
          : undefined;
        return {
          finalUrl,
          title,
          pageKind: classifyPage(finalUrl, title, text),
          textSample: text.slice(0, 240),
          inputs,
          ...resources,
          ...(image ? { screenshot: image } : {}),
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
    const errorRecord =
      err && typeof err === 'object'
        ? /** @type {{ message?: string; code?: string }} */ (err)
        : null;
    return {
      ok: false,
      url,
      error: errorRecord?.message || String(err),
      ...(errorRecord?.code ? { code: errorRecord.code } : {}),
      elapsedMs: now() - started,
    };
  }
}

/**
 * Cookies of a stored platform session, for a smoke probe of that platform's own pages.
 * @param {Parameters<typeof readPlatformSession>[0]} env
 * @param {string} session platform whose KV session (auth:<platform>) to replay
 * @param {string} url probe target; must be on the session's host
 * @returns {Promise<{ ok: true; cookies: SmokeCookie[] } | { ok: false; status: number; error: string }>}
 */
export async function smokeCookiesFor(env, session, url) {
  const host = Object.hasOwn(SMOKE_SESSION_HOSTS, session) ? SMOKE_SESSION_HOSTS[session] : '';
  const target = URL.canParse(url) ? new URL(url) : null;
  if (!host || !target || !(target.hostname === host || target.hostname.endsWith(`.${host}`))) {
    return {
      ok: false,
      status: 400,
      error: `session=${session} cookies are only sent to ${host || 'a supported platform host'}`,
    };
  }
  const cookieString = await readPlatformSession(env, session);
  if (!cookieString) {
    return { ok: false, status: 404, error: `No ${session} session in KV (auth:${session})` };
  }
  return { ok: true, cookies: toJobKoreaBrowserCookies(cookieString) };
}

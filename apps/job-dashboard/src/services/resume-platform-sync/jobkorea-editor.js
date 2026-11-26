import { withJobKoreaBrowserSession as defaultWithBrowserSession } from '../jobkorea-browser-session.js';
import { openJobKoreaEditorPage } from './jobkorea-navigation.js';

const ORIGIN = 'https://www.jobkorea.co.kr';
const RESUMES = '/resume/api/resume-display/v2/resumes';
export const JOBKOREA_SESSION_EXPIRED = 'JOBKOREA_SESSION_EXPIRED';

/** @param {unknown} value @returns {value is string} */
export function isResumeVersion(value) {
  return typeof value === 'string' && /^"rv1-[0-9a-f]{64}"$/.test(value);
}

/**
 * @typedef {Parameters<typeof defaultWithBrowserSession>[0]} BrowserEnv
 * @typedef {(env: BrowserEnv, opts: {withBrowserSession: typeof defaultWithBrowserSession}) => Promise<string>} JobKoreaLogin
 * @typedef {import('@cloudflare/puppeteer').Page} Page
 * @typedef {{
 *   content: Record<string, unknown>, etag: string,
 *   save(section: string, payload: object, version: string): Promise<{status: number, etag: string | null, problem: string | null}>
 * }} Editor
 */

/** @param {string} header */
export function toJobKoreaBrowserCookies(header) {
  return header.split(';').flatMap((part) => {
    const pair = part.trim();
    const i = pair.indexOf('=');
    return i > 0
      ? [{ name: pair.slice(0, i), value: pair.slice(i + 1), domain: '.jobkorea.co.kr', path: '/' }]
      : [];
  });
}

/** @param {Page} page @param {number | undefined} status @param {number} dialogs @param {boolean} expired */
async function missingDraft(page, status, dialogs, expired) {
  const pathname = new URL(page.url()).pathname;
  const path = /^\/resume\/edit\//i.test(pathname)
    ? '/resume/edit/<id>'
    : (/^\/(Login|user\/TwoFactorAuth|notice)(\/|$)/i.exec(pathname)?.[0] ?? 'unrecognized');
  const signals = await page
    .evaluate(() => {
      /** @param {string} selector */
      const visible = (selector) =>
        [...document.querySelectorAll(selector)].some(
          (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'
        );
      return {
        title: /이력서 수정|로그인|2단계 인증|공지사항/.exec(document.title)?.[0] ?? 'unrecognized',
        login: visible('input[type="password"]'),
        twoFactor: visible('#tfaCertNum, #tfaBtnSend'),
        notice: visible('dialog[open], [role="alertdialog"], [aria-modal="true"]'),
      };
    })
    .catch(() => null);
  const login = /\/login/i.test(path) || signals?.login || signals?.title === '로그인';
  const twoFactor =
    /TwoFactorAuth/i.test(path) || signals?.twoFactor || signals?.title === '2단계 인증';
  const notice =
    /notice/i.test(path) || signals?.notice || signals?.title === '공지사항' || dialogs > 0;
  return Object.assign(
    new Error(
      `JobKorea editor draft unavailable (path=${path}, title=${signals?.title ?? 'unavailable'}, login=${login}, 2fa=${twoFactor}, notice=${notice}, dialogs=${dialogs}, status=${status ?? 'unavailable'})`
    ),
    login || expired || status === 401 ? { code: JOBKOREA_SESSION_EXPIRED } : {}
  );
}

/**
 * Observe the editor's own draft entry; never initiate or replay it.
 * @template T
 * @param {BrowserEnv} env
 * @param {{rNo: string, cookieString?: string, login?: JobKoreaLogin}} session
 * @param {(editor: Editor) => Promise<T>} fn
 * @param {{withBrowserSession?: typeof defaultWithBrowserSession}} [deps]
 */
export async function withJobKoreaEditor(
  env,
  { rNo, cookieString = '', login },
  fn,
  { withBrowserSession = defaultWithBrowserSession } = {}
) {
  return withBrowserSession(
    env,
    async (browser) => {
      const cookies = login
        ? await login(env, { withBrowserSession: (_env, run) => run(browser) })
        : cookieString;
      const page = await browser.newPage();
      let dialogs = 0;
      let expired = false;
      page.on('dialog', (dialog) => {
        dialogs++;
        expired ||= dialog.message().includes('세션');
        void dialog.dismiss().catch(() => {});
      });
      try {
        await page.setCookie(...toJobKoreaBrowserCookies(cookies));
        const target = `${ORIGIN}/resume/edit/${encodeURIComponent(rNo)}`;
        const waiting = page
          .waitForResponse(
            (res) => {
              const url = new URL(res.url());
              return (
                url.origin === ORIGIN &&
                url.pathname === `${RESUMES}/drafts` &&
                res.request().method() === 'POST'
              );
            },
            { timeout: 20_000 }
          )
          .catch(() => null);
        const [response, documentStatus] = await Promise.all([
          waiting,
          openJobKoreaEditorPage(page, target).catch(() => undefined),
        ]);
        const draft = await response?.json().catch(() => null);
        const etag = response?.headers().etag;
        if (
          !response?.ok() ||
          String(draft?.resumeNo) !== String(rNo) ||
          !draft.content ||
          typeof draft.content !== 'object' ||
          !isResumeVersion(etag) ||
          new URL(page.url()).origin !== ORIGIN ||
          expired
        ) {
          throw await missingDraft(page, response?.status() ?? documentStatus, dialogs, expired);
        }
        return await fn({
          content: draft.content,
          etag,
          save: (section, payload, version) => {
            if (dialogs || !isResumeVersion(version))
              throw new Error('JobKorea editor is not ready to save');
            return page.evaluate(
              async (url, path, data, match) => {
                if (location.origin + location.pathname !== url)
                  throw new Error('JobKorea editor navigated away');
                const response = await fetch(path, {
                  method: 'POST',
                  credentials: 'same-origin',
                  redirect: 'error',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-HTTP-Method-Override': 'PUT',
                    'If-Match': match,
                  },
                  body: JSON.stringify(data),
                  signal: AbortSignal.timeout(20_000),
                });
                const etag = response.headers.get('etag');
                if (response.ok) return { status: response.status, etag, problem: null };
                // Keep the rejection's codes, messages and field paths, never submitted values.
                const body = await response.json().catch(() => null);
                /** @param {unknown} o */
                const pick = (o) =>
                  o && typeof o === 'object'
                    ? Object.fromEntries(
                        ['code', 'error', 'message', 'title', 'detail', 'field', 'path'].flatMap(
                          (k) => {
                            const v = /** @type {Record<string, unknown>} */ (o)[k];
                            return typeof v === 'string' ? [[k, v]] : [];
                          }
                        )
                      )
                    : {};
                const list = ['errors', 'fieldErrors', 'violations', 'details']
                  .map((k) => body?.[k])
                  .find(Array.isArray);
                const summary = {
                  ...pick(body),
                  ...(list ? { items: list.slice(0, 5).map(pick) } : {}),
                };
                return {
                  status: response.status,
                  etag,
                  problem: JSON.stringify(summary).slice(0, 400),
                };
              },
              target,
              `${RESUMES}/${encodeURIComponent(rNo)}/sections/${encodeURIComponent(section)}`,
              payload,
              version
            );
          },
        });
      } finally {
        await page.close().catch(() => {});
      }
    },
    { name: 'jobkorea-resume-sync' }
  );
}

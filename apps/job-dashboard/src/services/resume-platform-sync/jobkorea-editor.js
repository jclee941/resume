import { withBrowserSession as defaultWithBrowserSession } from '../browser-session.js';

export const JOBKOREA_RESUME_EDIT_URL = 'https://www.jobkorea.co.kr/User/Resume/Edit';
export const JOBKOREA_SESSION_EXPIRED = 'JOBKOREA_SESSION_EXPIRED';
const JOBKOREA_RESUME_SAVE_PATH = '/User/Resume/Save';
const RESUME_FORM_SELECTOR = '#frm1';
const FORM_WAIT_TIMEOUT_MS = 20_000;
const EDIT_TOKEN_NAMES = ['IsEditPage', 'LastEditDateTicks'];

/**
 * @typedef {{ name: string; value: string }} SerializedField
 * @typedef {{ name: string; value: string; domain: string; path: string }} BrowserCookie
 * @typedef {{ status: number; text: string }} JobKoreaSaveResponse
 * @typedef {{
 *   fields: SerializedField[];
 *   tokens: Record<string, string>;
 *   save(body: string): Promise<JobKoreaSaveResponse>;
 * }} JobKoreaEditor
 */

/**
 * @param {string} cookieString `name=value; name2=value2` as stored in auth:jobkorea
 * @returns {BrowserCookie[]}
 */
export function toJobKoreaBrowserCookies(cookieString) {
  /** @type {BrowserCookie[]} */
  const cookies = [];
  for (const part of String(cookieString || '').split(';')) {
    const pair = part.trim();
    const separator = pair.indexOf('=');
    if (separator <= 0) continue;
    cookies.push({
      name: pair.slice(0, separator),
      value: pair.slice(separator + 1),
      domain: '.jobkorea.co.kr',
      path: '/',
    });
  }
  return cookies;
}

/**
 * @param {{ url(): string; title(): Promise<string> }} page
 * @param {string[]} alerts
 * @returns {Promise<Error & { code?: string }>}
 */
async function editorMissingError(page, alerts) {
  const path = new URL(page.url()).pathname;
  const title = await page.title().catch(() => '');
  const alert = alerts.length > 0 ? `, alert=${alerts.join(' | ')}` : '';
  /** @type {Error & { code?: string }} */
  const error = new Error(
    `JobKorea resume form ${RESUME_FORM_SELECTOR} not found (path=${path}, title=${title}${alert})`
  );
  if (/\/login/i.test(path) || alerts.some((message) => message.includes('세션'))) {
    error.code = JOBKOREA_SESSION_EXPIRED;
  }
  return error;
}

/**
 * Open the JobKorea resume editor with the stored session and hand `fn` the live
 * form, serialized the way the browser submits it, plus a save that posts from the
 * editor page. JobKorea honours the session only inside the browser: a plain Worker
 * fetch with the same cookies gets its "session expired" page.
 * @template T
 * @param {Parameters<typeof defaultWithBrowserSession>[0]} env
 * @param {{ cookieString: string; rNo: string }} session
 * @param {(editor: JobKoreaEditor) => Promise<T>} fn
 * @param {{ withBrowserSession?: typeof defaultWithBrowserSession }} [deps]
 * @returns {Promise<T>}
 */
export async function withJobKoreaEditor(
  env,
  { cookieString, rNo },
  fn,
  { withBrowserSession = defaultWithBrowserSession } = {}
) {
  return withBrowserSession(
    env,
    async (browser) => {
      const page = await browser.newPage();
      /** @type {string[]} */
      const alerts = [];
      page.on('dialog', (dialog) => {
        alerts.push(dialog.message());
        dialog.dismiss().catch(() => {});
      });
      try {
        await page.setCookie(...toJobKoreaBrowserCookies(cookieString));
        await page.goto(`${JOBKOREA_RESUME_EDIT_URL}?RNo=${encodeURIComponent(rNo)}`, {
          waitUntil: 'domcontentloaded',
        });
        await page
          .waitForSelector(RESUME_FORM_SELECTOR, { timeout: FORM_WAIT_TIMEOUT_MS })
          .catch(async () => {
            throw await editorMissingError(page, alerts);
          });
        const { fields, tokens } = await page.evaluate(
          (selector, tokenNames) => {
            const form = document.querySelector(selector);
            /** @type {Array<{ name: string; value: string }>} */
            const serialized = [];
            if (form instanceof HTMLFormElement) {
              for (const [name, value] of new FormData(form).entries()) {
                if (typeof value === 'string') serialized.push({ name, value });
              }
            }
            /** @type {Record<string, string>} */
            const found = {};
            for (const name of tokenNames) {
              const element = document.getElementsByName(name)[0];
              if (element instanceof HTMLInputElement) found[name] = element.value;
            }
            return { fields: serialized, tokens: found };
          },
          RESUME_FORM_SELECTOR,
          EDIT_TOKEN_NAMES
        );
        return await fn({
          fields,
          tokens,
          save: (body) =>
            page.evaluate(
              async (path, payload) => {
                const response = await fetch(`${path}?_=${Date.now()}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json, text/javascript, */*; q=0.01',
                  },
                  body: payload,
                  credentials: 'same-origin',
                });
                return { status: response.status, text: await response.text() };
              },
              JOBKOREA_RESUME_SAVE_PATH,
              body
            ),
        });
      } finally {
        await page.close().catch(() => {});
      }
    },
    { name: 'jobkorea-resume-sync' }
  );
}

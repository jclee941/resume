import { withBrowserSession as defaultWithBrowserSession } from '../browser-session.js';

export const JOBKOREA_RESUME_EDIT_URL = 'https://www.jobkorea.co.kr/User/Resume/Edit';
const RESUME_FORM_SELECTOR = '#frm1';
const FORM_WAIT_TIMEOUT_MS = 20_000;

/**
 * @typedef {{ name: string; value: string }} SerializedField
 * @typedef {{ name: string; value: string; domain: string; path: string }} BrowserCookie
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
 * Serialize the JobKorea resume edit form the way the browser submits it, so the
 * save keeps checked radios, selected options, and JS-populated inputs intact.
 * @param {Parameters<typeof defaultWithBrowserSession>[0]} env
 * @param {{ cookieString: string; rNo: string }} session
 * @param {{ withBrowserSession?: typeof defaultWithBrowserSession }} [deps]
 * @returns {Promise<SerializedField[]>}
 */
export async function readJobKoreaFormViaBrowser(
  env,
  { cookieString, rNo },
  { withBrowserSession = defaultWithBrowserSession } = {}
) {
  return withBrowserSession(
    env,
    async (browser) => {
      const page = await browser.newPage();
      try {
        await page.setCookie(...toJobKoreaBrowserCookies(cookieString));
        await page.goto(`${JOBKOREA_RESUME_EDIT_URL}?RNo=${encodeURIComponent(rNo)}`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForSelector(RESUME_FORM_SELECTOR, { timeout: FORM_WAIT_TIMEOUT_MS });
        return await page.evaluate((selector) => {
          const form = document.querySelector(selector);
          if (!(form instanceof HTMLFormElement)) return [];
          /** @type {Array<{ name: string; value: string }>} */
          const fields = [];
          for (const [name, value] of new FormData(form).entries()) {
            if (typeof value === 'string') fields.push({ name, value });
          }
          return fields;
        }, RESUME_FORM_SELECTOR);
      } finally {
        await page.close().catch(() => {});
      }
    },
    { name: 'jobkorea-resume-sync' }
  );
}

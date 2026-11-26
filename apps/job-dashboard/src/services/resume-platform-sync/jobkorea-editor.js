import { withJobKoreaBrowserSession as defaultWithBrowserSession } from '../jobkorea-browser-session.js';
import { openJobKoreaEditorPage } from './jobkorea-navigation.js';

export const JOBKOREA_RESUME_EDIT_URL = 'https://www.jobkorea.co.kr/User/Resume/Edit';
export const JOBKOREA_SESSION_EXPIRED = 'JOBKOREA_SESSION_EXPIRED';
const JOBKOREA_RESUME_SAVE_PATH = '/User/Resume/Save';
const RESUME_FORM_SELECTOR = '#frm1';
const FORM_WAIT_TIMEOUT_MS = 20_000;
const EDIT_TOKEN_NAMES = ['IsEditPage', 'LastEditDateTicks'];
/** Sections the SSoT sync fills; a section not added to the resume keeps none of its rows. */
const SYNCED_SECTION_IDS = [
  'InputStat_CareerInputStat',
  'InputStat_LicenseInputStat',
  'InputStat_AwardInputStat',
  'InputStat_SchoolInputStat',
];
const SECTION_ADD_LABEL = '필드추가';
const SECTION_ADD_TIMEOUT_MS = 5_000;

/**
 * @typedef {{ name: string; value: string }} SerializedField
 * @typedef {{ name: string; value: string; domain: string; path: string }} BrowserCookie
 * @typedef {{ status: number; text: string }} JobKoreaSaveResponse
 * @typedef {{ syncId: string; flag: string | null; label: string | null }} SectionState
 * @typedef {{ syncId: string; before: SectionState; after: SectionState }} SectionAddition
 * @typedef {import('@cloudflare/puppeteer').Page} EditorPage
 * @typedef {{ dropped: boolean; image: boolean; flags: Array<{ name: string; value: string }> }} PhotoState
 * @typedef {{
 *   fields: SerializedField[];
 *   tokens: Record<string, string>;
 *   sections: SectionAddition[];
 *   dialogs: string[];
 *   photo: PhotoState;
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
 * Hidden InputStat flag and add/remove button label of each synced section (runs in the page).
 * @param {string[]} syncIds
 * @returns {SectionState[]}
 */
function readSectionStates(syncIds) {
  return syncIds.map((syncId) => {
    const flag = document.getElementById(syncId);
    const button = document.querySelector(`button[data-sync_id="${syncId}"]`);
    return {
      syncId,
      flag: flag instanceof HTMLInputElement ? flag.value : null,
      label: button?.textContent?.trim() ?? null,
    };
  });
}

/**
 * Whether the resume shows a photo: the picture widget, its image, and the hidden photo flags
 * (runs in the page).
 * @returns {PhotoState}
 */
function readPhotoState() {
  const picture = document.querySelector('div.picture');
  const image = document.querySelector('div.picture .image img');
  return {
    dropped: Boolean(picture?.classList.contains('dropped')),
    image: Boolean(image?.getAttribute('src')),
    flags: [...document.querySelectorAll('input.dev-photo, input[class*="dev-photo"]')].map(
      (input) => ({
        name: input.getAttribute('name') || '',
        value: input instanceof HTMLInputElement ? input.value : '',
      })
    ),
  };
}

/**
 * Add the synced sections the resume does not have yet and report every section before
 * and after. Only the hidden InputStat flag tells whether a section is on the resume: the
 * button reads 필드추가 either way, and clicking it on an added section asks to delete it.
 * @param {EditorPage} page
 * @returns {Promise<SectionAddition[]>}
 */
async function addSyncedSections(page) {
  const before = await page.evaluate(readSectionStates, SYNCED_SECTION_IDS);
  const pending = before.filter((state) => state.flag === 'False').map((state) => state.syncId);
  if (pending.length > 0) {
    await page.evaluate(
      (syncIds, addLabel) => {
        for (const syncId of syncIds) {
          const flag = document.getElementById(syncId);
          const button = document.querySelector(`button[data-sync_id="${syncId}"]`);
          if (
            flag instanceof HTMLInputElement &&
            flag.value === 'False' &&
            button instanceof HTMLButtonElement &&
            button.textContent?.trim() === addLabel
          ) {
            button.click();
          }
        }
      },
      pending,
      SECTION_ADD_LABEL
    );
    await page
      .waitForFunction(
        (syncIds) =>
          syncIds.every((syncId) => {
            const flag = document.getElementById(syncId);
            return flag instanceof HTMLInputElement && flag.value === 'True';
          }),
        { timeout: SECTION_ADD_TIMEOUT_MS },
        pending
      )
      .then(
        () => undefined,
        () => undefined
      );
  }
  const after = await page.evaluate(readSectionStates, SYNCED_SECTION_IDS);
  return before.map((state, index) => ({
    syncId: state.syncId,
    before: state,
    after: after[index],
  }));
}

/**
 * Find the form in the page, not just an element with the old ID.
 * @param {string} selector
 * @param {string} savePath
 * @returns {HTMLFormElement | undefined}
 */
function findResumeForm(selector, savePath) {
  const preferred = document.querySelector(selector);
  if (preferred instanceof HTMLFormElement) return preferred;

  const forms = Array.from(document.forms);
  return (
    forms.find((form) => {
      const action = form.getAttribute('action');
      if (!action || !URL.canParse(action, document.baseURI)) return false;
      const { origin, pathname } = new URL(action, document.baseURI);
      const path = pathname.toLowerCase().replace(/\/$/, '');
      return (
        origin === location.origin && (path === savePath.toLowerCase() || path === '/resume/save')
      );
    }) ?? forms.find((form) => form.elements.namedItem('UserResume.M_Resume_Title'))
  );
}

/** Collect only form metadata and interstitial signals, not page text or field values. */
function readMissingFormEvidence() {
  /** @param {string} selector */
  const visible = (selector) =>
    Array.from(document.querySelectorAll(selector)).some(
      (element) =>
        element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible'
    );
  const title =
    /이력서 수정|로그인|2단계 인증|공지사항/.exec(document.title)?.[0] ?? 'unrecognized';
  return {
    title,
    forms: Array.from(document.forms)
      .slice(0, 5)
      .map((form) => {
        const action = form.getAttribute('action');
        const url =
          action && URL.canParse(action, document.baseURI)
            ? new URL(action, document.baseURI)
            : null;
        return {
          id: form.getAttribute('id')?.slice(0, 80) ?? '',
          name: form.getAttribute('name')?.slice(0, 80) ?? '',
          action: url && /^https?:$/.test(url.protocol) ? url.pathname.slice(0, 120) : '',
        };
      }),
    login: title === '로그인' || visible('form input[type="password"]'),
    twoFactor: title === '2단계 인증' || visible('#tfaCertNum, #tfaBtnSend'),
    notice:
      title === '공지사항' || visible('dialog[open], [role="alertdialog"], [aria-modal="true"]'),
  };
}

/**
 * @param {EditorPage} page
 * @param {string[]} dialogs
 * @returns {Promise<Error & { code?: string }>}
 */
async function editorMissingError(page, dialogs) {
  const path = new URL(page.url()).pathname;
  const evidence = await page.evaluate(readMissingFormEvidence).catch(() => null);
  const expired = dialogs.some((message) => message.includes('세션'));
  const login = /\/login/i.test(path) || (evidence?.login ?? 'unknown');
  const twoFactor = /\/twofactorauth\b/i.test(path) || (evidence?.twoFactor ?? 'unknown');
  const notice = /\/notice\b/i.test(path) || dialogs.length > 0 || (evidence?.notice ?? 'unknown');
  const safePath = path.replace(/(\/resume\/edit\/).+/i, '$1<id>');
  /** @type {Error & { code?: string }} */
  const error = new Error(
    `JobKorea resume form ${RESUME_FORM_SELECTOR} not found (path=${safePath}, ` +
      `title=${evidence?.title ?? 'unavailable'}, forms=${evidence ? JSON.stringify(evidence.forms) : 'unavailable'}, ` +
      `login=${login}, 2fa=${twoFactor}, notice=${notice}, dialogs=${dialogs.length}, sessionAlert=${expired})`
  );
  if (login === true || expired) {
    error.code = JOBKOREA_SESSION_EXPIRED;
  }
  return error;
}

/**
 * Logs in to JobKorea in the browser that `withBrowserSession` lends and returns the session
 * cookies (`name=value; name2=value2`).
 * @typedef {(
 *   env: Parameters<typeof defaultWithBrowserSession>[0],
 *   opts: { withBrowserSession: typeof defaultWithBrowserSession }
 * ) => Promise<string>} JobKoreaLogin
 */

/**
 * Open the JobKorea resume editor and hand `fn` the live form, serialized the way the browser
 * submits it, plus a save that posts from the editor page. JobKorea honours a session only inside
 * a browser (a plain Worker fetch with the same cookies gets its "session expired" page), and only
 * in the Browser Rendering browser that logged in: elsewhere its pages stall. With `login` the
 * editor's own browser logs in first and the editor opens with that login; otherwise
 * `cookieString` (a stored session) is replayed.
 * @template T
 * @param {Parameters<typeof defaultWithBrowserSession>[0]} env
 * @param {{ rNo: string; cookieString?: string; login?: JobKoreaLogin }} session
 * @param {(editor: JobKoreaEditor) => Promise<T>} fn
 * @param {{ withBrowserSession?: typeof defaultWithBrowserSession }} [deps]
 * @returns {Promise<T>}
 */
export async function withJobKoreaEditor(
  env,
  { cookieString = '', rNo, login },
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
      /** @type {string[]} */
      const dialogs = [];
      page.on('dialog', (dialog) => {
        dialogs.push(dialog.message());
        dialog.dismiss().catch(() => {});
      });
      try {
        await page.setCookie(...toJobKoreaBrowserCookies(cookies));
        await openJobKoreaEditorPage(
          page,
          `${JOBKOREA_RESUME_EDIT_URL}?RNo=${encodeURIComponent(rNo)}`
        );
        const resumeForm = await page
          .waitForFunction(
            findResumeForm,
            { timeout: FORM_WAIT_TIMEOUT_MS },
            RESUME_FORM_SELECTOR,
            JOBKOREA_RESUME_SAVE_PATH
          )
          .catch(async () => {
            throw await editorMissingError(page, dialogs);
          });
        const sections = await addSyncedSections(page);
        const photo = await page.evaluate(readPhotoState);
        const { fields, tokens } = await page.evaluate(
          (form, tokenNames) => {
            /** @type {Array<{ name: string; value: string }>} */
            const serialized = [];
            if (form instanceof HTMLFormElement && form.isConnected) {
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
          resumeForm,
          EDIT_TOKEN_NAMES
        );
        return await fn({
          fields,
          tokens,
          sections,
          dialogs,
          photo,
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

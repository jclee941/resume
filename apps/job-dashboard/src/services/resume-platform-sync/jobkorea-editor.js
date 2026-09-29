import { withBrowserSession as defaultWithBrowserSession } from '../browser-session.js';

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
 * @typedef {{
 *   fields: SerializedField[];
 *   tokens: Record<string, string>;
 *   sections: SectionAddition[];
 *   dialogs: string[];
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
 * Add the synced sections the resume does not have yet (button still reads 필드추가) and
 * report every section before and after; the after-state is the outcome of the add.
 * @param {EditorPage} page
 * @param {{ adding: boolean }} dialogState
 * @returns {Promise<SectionAddition[]>}
 */
async function addSyncedSections(page, dialogState) {
  const before = await page.evaluate(readSectionStates, SYNCED_SECTION_IDS);
  const pending = before.filter((state) => state.label === SECTION_ADD_LABEL).map((s) => s.syncId);
  if (pending.length > 0) {
    dialogState.adding = true;
    await page.evaluate(
      (syncIds, addLabel) => {
        for (const syncId of syncIds) {
          const button = document.querySelector(`button[data-sync_id="${syncId}"]`);
          if (button instanceof HTMLButtonElement && button.textContent?.trim() === addLabel) {
            button.click();
          }
        }
      },
      pending,
      SECTION_ADD_LABEL
    );
    await page
      .waitForFunction(
        (syncIds, addLabel) =>
          syncIds.every(
            (syncId) =>
              document.querySelector(`button[data-sync_id="${syncId}"]`)?.textContent?.trim() !==
              addLabel
          ),
        { timeout: SECTION_ADD_TIMEOUT_MS },
        pending,
        SECTION_ADD_LABEL
      )
      .then(
        () => undefined,
        () => undefined
      );
    dialogState.adding = false;
  }
  const after = await page.evaluate(readSectionStates, SYNCED_SECTION_IDS);
  return before.map((state, index) => ({
    syncId: state.syncId,
    before: state,
    after: after[index],
  }));
}

/**
 * @param {{ url(): string; title(): Promise<string> }} page
 * @param {string[]} dialogs
 * @returns {Promise<Error & { code?: string }>}
 */
async function editorMissingError(page, dialogs) {
  const path = new URL(page.url()).pathname;
  const title = await page.title().catch(() => '');
  const alert = dialogs.length > 0 ? `, alert=${dialogs.join(' | ')}` : '';
  /** @type {Error & { code?: string }} */
  const error = new Error(
    `JobKorea resume form ${RESUME_FORM_SELECTOR} not found (path=${path}, title=${title}${alert})`
  );
  if (/\/login/i.test(path) || dialogs.some((message) => message.includes('세션'))) {
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
      const dialogs = [];
      const dialogState = { adding: false };
      page.on('dialog', (dialog) => {
        dialogs.push(dialog.message());
        const answer =
          dialogState.adding && dialog.type() === 'confirm' ? dialog.accept() : dialog.dismiss();
        answer.catch(() => {});
      });
      try {
        await page.setCookie(...toJobKoreaBrowserCookies(cookieString));
        await page.goto(`${JOBKOREA_RESUME_EDIT_URL}?RNo=${encodeURIComponent(rNo)}`, {
          waitUntil: 'domcontentloaded',
        });
        await page
          .waitForSelector(RESUME_FORM_SELECTOR, { timeout: FORM_WAIT_TIMEOUT_MS })
          .catch(async () => {
            throw await editorMissingError(page, dialogs);
          });
        const sections = await addSyncedSections(page, dialogState);
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
          sections,
          dialogs,
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

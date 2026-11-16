/**
 * @fileoverview Applies to a JobKorea posting through 즉시지원. KV cookies do not carry into a new
 * Browser Rendering browser, so the account logs in inside the browser that applies (as the
 * history read does) and that login's cookies are replayed into a fresh context there. Postings
 * without 즉시지원 (홈페이지 or email application) or with a company form are skipped, never
 * counted as applied. In preview mode the flow stops at the OnPass popup without clicking 지원하기.
 * @module workflows/application/jobkorea-submit
 */
import { mintJobKoreaSession as defaultMint } from '../../handlers/jobkorea/mint-session.js';
import { settleWithin } from '../../services/browser-session.js';
import { withJobKoreaBrowserSession as defaultWithBrowserSession } from '../../services/jobkorea-browser-session.js';
import { restrictToJobKorea } from '../../services/jobkorea-request-filter.js';
import { toJobKoreaBrowserCookies } from '../../services/resume-platform-sync/jobkorea-editor.js';
import {
  ALREADY_APPLIED_TEXT,
  CUSTOM_FORM_TEXT,
  IMMEDIATE_APPLY_TEXT,
  STEP_TIMEOUT_MS,
  SUBMITTED_TEXT,
  SUBMIT_TEXT,
  bodyText,
  findControl,
  openOnPass,
  waitFor,
} from './jobkorea-apply-page.js';
import { JOBKOREA_POSTING_URL } from './jobkorea-postings.js';

const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);
/** The whole attempt, login included, inside the 5 minute apply step. */
const SUBMIT_BUDGET_MS = 150_000;
const CLEANUP_TIMEOUT_MS = 5_000;

/**
 * @typedef {import('./application-submitters.js').SubmitResult} SubmitResult
 * @typedef {Parameters<typeof defaultMint>[0]} JobKoreaSubmitEnv
 * @typedef {{
 *   preview?: boolean;
 *   withBrowserSession?: typeof defaultWithBrowserSession;
 *   mint?: typeof defaultMint;
 *   budgetMs?: number;
 * }} JobKoreaSubmitOptions
 */

/**
 * @param {JobKoreaSubmitEnv} env
 * @param {string} jobId `jobkorea-<GI_No>` or the bare GI_No
 * @param {JobKoreaSubmitOptions} [options]
 * @returns {Promise<SubmitResult>}
 */
export async function submitJobKoreaApplication(env, jobId, options = {}) {
  const {
    preview = false,
    withBrowserSession = defaultWithBrowserSession,
    mint = defaultMint,
    budgetMs = SUBMIT_BUDGET_MS,
  } = options;
  const giNo = String(jobId).match(/\d+/)?.[0];
  if (!giNo) return failure(`JobKorea posting id is missing in ${jobId}`);
  const work = withBrowserSession(env, async (browser) => {
    /** @type {typeof defaultWithBrowserSession} */
    const sameBrowser = (_env, fn) => fn(browser);
    const session = await mint(env, { withBrowserSession: sameBrowser });
    const context = await browser.createBrowserContext();
    try {
      const page = await context.newPage();
      await restrictToJobKorea(page, BLOCKED_RESOURCE_TYPES);
      await page.setCookie(...toJobKoreaBrowserCookies(session));
      await page.goto(`${JOBKOREA_POSTING_URL}/${giNo}`, {
        waitUntil: 'domcontentloaded',
        timeout: STEP_TIMEOUT_MS,
      });
      return await applyOnPostingPage(browser, page, { preview });
    } finally {
      await settleWithin(context.close(), CLEANUP_TIMEOUT_MS);
    }
  });
  const outcome = await settleWithin(
    work.then(
      (result) => ({ result }),
      (error) => ({ error })
    ),
    budgetMs
  );
  if (outcome === null) return failure(`JobKorea application gave up after ${budgetMs} ms`);
  if ('error' in outcome) {
    return failure(outcome.error instanceof Error ? outcome.error.message : String(outcome.error));
  }
  return outcome.result;
}

/**
 * @param {Pick<import('@cloudflare/puppeteer').Browser, 'targets'>} browser
 * @param {import('./jobkorea-apply-page.js').ApplyPage} page
 * @param {{ preview?: boolean; timeoutMs?: number }} [options] `timeoutMs` bounds each wait
 * @returns {Promise<SubmitResult>}
 */
export async function applyOnPostingPage(
  browser,
  page,
  { preview = false, timeoutMs = STEP_TIMEOUT_MS } = {}
) {
  const apply = await waitFor(
    async () =>
      (await findControl(page, ALREADY_APPLIED_TEXT))
        ? 'applied'
        : findControl(page, IMMEDIATE_APPLY_TEXT),
    timeoutMs
  );
  if (apply === 'applied') {
    return {
      success: false,
      alreadyApplied: true,
      status: 'already_applied',
      platform: 'jobkorea',
    };
  }
  if (!apply) return skipped('the posting offers no 즉시지원 (homepage or email application)');
  await page.click(apply.selector);
  const onPass = await openOnPass(browser, page, timeoutMs);
  if (!onPass) return failure('the OnPass popup did not open after 즉시지원');
  const submit = await waitFor(() => findControl(onPass, SUBMIT_TEXT), timeoutMs);
  const customForm = CUSTOM_FORM_TEXT.test(await bodyText(onPass));
  const popupTitle = await onPass.evaluate(() => document.title, undefined);
  if (preview) {
    return {
      success: false,
      preview: true,
      status: 'preview',
      platform: 'jobkorea',
      onPassReached: true,
      popupTitle,
      submitControl: Boolean(submit),
      customForm,
      networkWrite: false,
    };
  }
  if (customForm) return skipped('the posting asks for a company form or screening questions');
  if (!submit) return failure('the OnPass popup shows no 지원하기 button');
  // JobKorea may confirm or report through a JS dialog, which would otherwise block the page.
  let dialogText = '';
  const owner = 'frames' in onPass ? onPass : onPass.page();
  owner.on('dialog', (dialog) => {
    dialogText += ` ${dialog.message()}`;
    dialog.accept().catch(() => {});
  });
  await onPass.click(submit.selector);
  const confirmed = await waitFor(
    async () => (SUBMITTED_TEXT.test(`${dialogText} ${await bodyText(onPass)}`) ? true : null),
    timeoutMs
  );
  if (!confirmed) return failure('JobKorea did not confirm the application (지원완료)');
  return { success: true, platform: 'jobkorea', platformResponse: { popupTitle } };
}

/**
 * @param {string} reason
 * @returns {SubmitResult}
 */
function skipped(reason) {
  return {
    success: false,
    skipped: true,
    status: 'skipped',
    platform: 'jobkorea',
    error: `Skipped: ${reason}`,
  };
}

/**
 * @param {string} error
 * @returns {SubmitResult}
 */
function failure(error) {
  return { success: false, platform: 'jobkorea', error };
}

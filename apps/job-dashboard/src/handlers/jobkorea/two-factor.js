/**
 * @fileoverview Clears JobKorea's two-factor challenge (/user/TwoFactorAuth/Index) with a code
 * sent to the account email, which the owner forwards to jobkorea-2fa@jclee.me where the Worker's
 * email handler stores it in KV. Drives the page's own controls in the login's browser context,
 * because the pending challenge is bound to that context's cookies: pick the email method, send
 * once, wait for the code, verify, then confirm the completion dialog that moves on to nextUrl.
 * @module handlers/jobkorea/two-factor
 */

import { sendTelegramNotification } from '../../services/notifications.js';
import { reserveTwoFactorSend, waitForTwoFactorCode } from './two-factor-code.js';

export const JOBKOREA_2FA_REQUIRED = 'JOBKOREA_2FA_REQUIRED';
const TWO_FACTOR_PATH = '/TwoFactorAuth';
const EMAIL_METHOD = 'input[name="method"][value="2"]';
const SEND_BUTTON = '#tfaBtnSend';
const CODE_INPUT = '#tfaCertNum';
const VERIFY_BUTTON = '#tfaBtnSubmit';
const DIALOG_OK = '#tfaDialogOk';
const STEP_TIMEOUT_MS = 30_000;

/**
 * @typedef {'JOBKOREA_2FA_SEND_LIMIT'
 *   | 'JOBKOREA_2FA_SEND_FAILED'
 *   | 'JOBKOREA_2FA_CODE_TIMEOUT'
 *   | 'JOBKOREA_2FA_VERIFY_FAILED'} TwoFactorReason
 * @typedef {import('./two-factor-code.js').TwoFactorCodeEnv
 *   & import('../../services/notifications.js').NotificationEnv} TwoFactorEnv
 * @typedef {{
 *   codeWait?: Omit<import('./two-factor-code.js').CodeWait, 'sentAt'>;
 *   clock?: () => number;
 *   notify?: (env: TwoFactorEnv, text: string) => Promise<unknown>;
 *   assertOpen?: (next: string) => void;
 * }} TwoFactorOptions
 */

/**
 * The challenge needs the KV store the mail handler writes to and the notification bindings; envs
 * built for a narrower caller may lack them.
 * @param {Record<string, unknown>} env
 * @returns {env is TwoFactorEnv}
 */
export function hasTwoFactorBindings(env) {
  const kv = /** @type {{ get?: unknown, put?: unknown } | undefined} */ (env.SESSIONS);
  return typeof kv?.get === 'function' && typeof kv.put === 'function' && Boolean(env.JOB_DB);
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @returns {boolean}
 */
export function isTwoFactorPage(page) {
  return page.url().includes(TWO_FACTOR_PATH);
}

/**
 * @param {TwoFactorReason} reason
 * @param {string} detail
 * @returns {Error & { code: string, reason: TwoFactorReason }}
 */
function twoFactorError(reason, detail) {
  return Object.assign(new Error(`${JOBKOREA_2FA_REQUIRED}: ${reason}: ${detail}`), {
    code: JOBKOREA_2FA_REQUIRED,
    reason,
  });
}

/**
 * Clicks a control that posts to `path` and returns the `code` field of the JSON answer.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string} selector
 * @param {string} path
 * @returns {Promise<string>}
 */
async function clickForAnswer(page, selector, path) {
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(path) && r.request().method() === 'POST', {
      timeout: STEP_TIMEOUT_MS,
    }),
    page.click(selector),
  ]);
  const body = /** @type {{ code?: unknown } | null} */ (await response.json().catch(() => null));
  return typeof body?.code === 'string' ? body.code : 'UNREADABLE';
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @returns {Promise<void>}
 */
async function confirmDialog(page) {
  await page.waitForSelector(DIALOG_OK, { visible: true, timeout: STEP_TIMEOUT_MS });
  await page.click(DIALOG_OK);
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {TwoFactorEnv} env
 * @param {Required<Omit<TwoFactorOptions, 'notify'>>} options
 * @returns {Promise<void>}
 */
async function passChallenge(page, env, { codeWait, clock, assertOpen }) {
  assertOpen('the two-factor code was requested');
  if (!(await reserveTwoFactorSend(env, clock()))) {
    throw twoFactorError('JOBKOREA_2FA_SEND_LIMIT', "today's automated code sends are used up");
  }
  await page.click(EMAIL_METHOD);
  const sent = await clickForAnswer(page, SEND_BUTTON, '/TwoFactorAuth/Send');
  if (sent !== 'OK') throw twoFactorError('JOBKOREA_2FA_SEND_FAILED', `Send answered ${sent}`);
  const sentAt = clock();
  await confirmDialog(page);

  const code = await waitForTwoFactorCode(env, { clock, ...codeWait, sentAt });
  if (!code) throw twoFactorError('JOBKOREA_2FA_CODE_TIMEOUT', 'no emailed code arrived in time');
  await page.type(CODE_INPUT, code);
  const verified = await clickForAnswer(page, VERIFY_BUTTON, '/TwoFactorAuth/Verify');
  if (verified !== 'OK') {
    throw twoFactorError('JOBKOREA_2FA_VERIFY_FAILED', `Verify answered ${verified}`);
  }
  await Promise.all([
    page
      .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT_MS })
      .catch(() => {}),
    confirmDialog(page),
  ]);
}

/**
 * @param {TwoFactorEnv} env
 * @param {string} text
 * @returns {Promise<unknown>}
 */
function notifyTelegram(env, text) {
  return sendTelegramNotification(env, { text });
}

/**
 * Clears the challenge the page is on. A failure throws JOBKOREA_2FA_REQUIRED with a `reason`, after
 * one Telegram note, so callers keep treating it as "JobKorea needs two-factor authentication".
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {TwoFactorEnv} env
 * @param {TwoFactorOptions} [options]
 * @returns {Promise<void>}
 */
export async function resolveTwoFactor(page, env, options = {}) {
  const {
    codeWait = {},
    clock = Date.now,
    notify = notifyTelegram,
    assertOpen = () => {},
  } = options;
  try {
    await passChallenge(page, env, { codeWait, clock, assertOpen });
  } catch (error) {
    const reason = /** @type {{ reason?: TwoFactorReason } | null} */ (error)?.reason;
    if (reason) {
      await notify(
        env,
        `JobKorea two-factor login failed (${reason}); JobKorea runs are skipped.`
      ).catch((notifyError) => console.warn('[jobkorea-2fa] Telegram note failed:', notifyError));
    }
    throw error;
  }
}

/**
 * @fileoverview KV contract between the inbound-mail handler, which stores the JobKorea two-factor
 * code it receives at jobkorea-2fa@jclee.me, and the login, which waits for that code after asking
 * JobKorea to send one. Also guards how many codes the automation may request per UTC day: JobKorea
 * allows five sends per channel per day, and the last one stays with the owner.
 * @module handlers/jobkorea/two-factor-code
 */

export const JOBKOREA_2FA_CODE_KEY = 'jobkorea:2fa:code';
const CODE_TTL_S = 300;
// The mail can be stamped a little before the login records the send.
const CLOCK_SKEW_MS = 5_000;
const SEND_KEY_PREFIX = 'jobkorea:2fa:sends:';
const SEND_KEY_TTL_S = 2 * 24 * 60 * 60;
export const MAX_AUTOMATED_SENDS_PER_DAY = 4;
const DEFAULT_WAIT_MS = 150_000;
const DEFAULT_INTERVAL_MS = 3_000;
const CODE_PATTERN = /^\d{1,10}$/;

/**
 * @typedef {{
 *   get(key: string): Promise<string | null>;
 *   put(key: string, value: string, options?: { expirationTtl?: number }): Promise<unknown>;
 * }} TwoFactorKv
 * @typedef {{ SESSIONS: TwoFactorKv }} TwoFactorCodeEnv
 * @typedef {{
 *   sentAt: number;
 *   timeoutMs?: number;
 *   intervalMs?: number;
 *   clock?: () => number;
 *   sleep?: (ms: number) => Promise<void>;
 * }} CodeWait
 */

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleepFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {TwoFactorCodeEnv} env
 * @param {string} code
 * @param {number} receivedAt epoch milliseconds
 * @returns {Promise<void>}
 */
export async function storeTwoFactorCode(env, code, receivedAt) {
  await env.SESSIONS.put(JOBKOREA_2FA_CODE_KEY, JSON.stringify({ code, receivedAt }), {
    expirationTtl: CODE_TTL_S,
  });
}

/**
 * @param {string | null} stored
 * @returns {{ code?: unknown, receivedAt?: unknown }}
 */
function parseStored(stored) {
  try {
    const value = JSON.parse(stored ?? 'null');
    return typeof value === 'object' && value !== null ? value : {};
  } catch {
    return {};
  }
}

/**
 * A code counts only when it arrived after the send, so a code from an earlier challenge is never
 * entered for this one.
 * @param {string | null} stored
 * @param {number} sentAt
 * @returns {string | null}
 */
function freshCode(stored, sentAt) {
  const { code, receivedAt } = parseStored(stored);
  if (typeof code !== 'string' || !CODE_PATTERN.test(code)) return null;
  if (typeof receivedAt !== 'number' || receivedAt < sentAt - CLOCK_SKEW_MS) return null;
  return code;
}

/**
 * Polls KV for a code received after the send.
 * @param {TwoFactorCodeEnv} env
 * @param {CodeWait} wait
 * @returns {Promise<string | null>} the code, or null once the wait is over
 */
export async function waitForTwoFactorCode(env, wait) {
  const {
    sentAt,
    timeoutMs = DEFAULT_WAIT_MS,
    intervalMs = DEFAULT_INTERVAL_MS,
    clock = Date.now,
    sleep = sleepFor,
  } = wait;
  const deadline = clock() + timeoutMs;
  for (;;) {
    const code = freshCode(await env.SESSIONS.get(JOBKOREA_2FA_CODE_KEY), sentAt);
    if (code) return code;
    if (clock() + intervalMs > deadline) return null;
    await sleep(intervalMs);
  }
}

/**
 * Counts one send against today's automated budget before the code is requested.
 * @param {TwoFactorCodeEnv} env
 * @param {number} now epoch milliseconds
 * @returns {Promise<boolean>} false when today's automated sends are used up
 */
export async function reserveTwoFactorSend(env, now) {
  const key = `${SEND_KEY_PREFIX}${new Date(now).toISOString().slice(0, 10)}`;
  const used = Number(await env.SESSIONS.get(key)) || 0;
  if (used >= MAX_AUTOMATED_SENDS_PER_DAY) return false;
  await env.SESSIONS.put(key, String(used + 1), { expirationTtl: SEND_KEY_TTL_S });
  return true;
}

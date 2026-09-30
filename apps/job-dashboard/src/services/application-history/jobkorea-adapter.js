/**
 * @fileoverview Reads the owner's JobKorea application history. JobKorea only honors its session
 * inside a browser, so the KV cookies are replayed in a Browser Rendering page that opens the
 * applied-list page and nothing else: it never clicks, so no cancel/edit/apply control is touched.
 * @module services/application-history/jobkorea-adapter
 */
import {
  withBrowserSession as defaultWithBrowserSession,
  settleWithin,
} from '../browser-session.js';
import { isJobKoreaHost, restrictToJobKorea } from '../jobkorea-request-filter.js';
import { readPlatformSession } from '../platform-session.js';
import { toJobKoreaBrowserCookies } from '../resume-platform-sync/jobkorea-editor.js';
import { HistorySyncError } from './history-types.js';
import {
  isApplyListPage,
  parseJobKoreaApplyList,
  parseJobKoreaPagerLinks,
} from './jobkorea-parser.js';

export const JOBKOREA_APPLY_LIST_URL = 'https://www.jobkorea.co.kr/User/ApplyMng';
const MAX_PAGES = 10;
const NAVIGATION_TIMEOUT_MS = 45_000;
/**
 * The history sync runs every platform under a 120 s cron budget (sync.js DEFAULT_TIMEOUT_MS).
 * Worst case for one page is two timed-out attempts (2 x 45 s = 90 s) plus two content reads and
 * the page close, each given up after SETTLE_TIMEOUT_MS because a stalled page can leave them
 * hanging. Each attempt's timeout is also capped by what is left of this 100 s deadline, so a slow
 * pager page cannot run past the cron budget and the adapter fails on its own, with its diagnosis,
 * before sync.js gives up.
 */
const ADAPTER_BUDGET_MS = 100_000;
const SETTLE_TIMEOUT_MS = 5_000;
/**
 * The adapter as a whole, from the KV session read through browser acquisition, page setup and
 * cleanup, gives up after this, so it always answers with its own TIMEOUT before sync.js's 120 s
 * fetch budget (which starts at the same moment) runs out.
 */
const ADAPTER_DEADLINE_MS = 110_000;
const TIMEOUT_MESSAGE = /timeout/i;
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet']);

/**
 * @param {string} href
 * @param {string} base
 * @returns {string | null} absolute https jobkorea.co.kr URL, or null for anything else
 */
function sameSiteUrl(href, base) {
  if (!URL.canParse(href, base)) return null;
  const url = new URL(href, base);
  return url.protocol === 'https:' && isJobKoreaHost(url.hostname) ? url.toString() : null;
}

/**
 * JobKorea inside Browser Rendering sometimes stalls past the navigation timeout. A timeout
 * whose document already is the applied list is good enough (the parser only needs the HTML);
 * otherwise the navigation is retried once, and the content is checked once more after the
 * retry times out before giving up. Every content read is bounded, including the one after a
 * navigation that succeeded.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string} url
 * @param {number} deadline epoch ms after which no further attempt may start
 * @param {number} settleMs how long a content read may take
 * @returns {Promise<string>} the page HTML (not yet checked for being the applied list)
 */
async function loadPage(page, url, deadline, settleMs) {
  /** @type {unknown} */
  let timedOut = new HistorySyncError('TIMEOUT', 'JobKorea sync budget exhausted');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const timeout = Math.min(NAVIGATION_TIMEOUT_MS, deadline - Date.now());
    if (timeout <= 0) break;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      const html = await settleWithin(page.content(), settleMs);
      if (html !== null) return html;
      // The document loaded but its HTML never came back; count it as a timed-out attempt.
      timedOut = new Error(`Navigation timeout: ${url} loaded but its HTML was not readable`);
    } catch (error) {
      if (!TIMEOUT_MESSAGE.test(error instanceof Error ? error.message : '')) throw error;
      timedOut = error;
      const html = await settleWithin(page.content(), settleMs);
      if (html !== null && isApplyListPage(html)) return html;
    }
  }
  throw timedOut;
}

/**
 * Adds to a navigation timeout the allowed requests the page was still waiting for (type, host and
 * path only, once each across the retry), so a stalled applied-list page says whether JobKorea's
 * document or a script held it.
 * @param {unknown} error
 * @param {string[]} pending
 * @returns {unknown}
 */
function withPendingRequests(error, pending) {
  if (error instanceof HistorySyncError || !(error instanceof Error)) return error;
  if (!TIMEOUT_MESSAGE.test(error.message)) return error;
  const stalled = [...new Set(pending)].join(', ') || 'none';
  return new Error(`${error.message}; pending: ${stalled}`, { cause: error });
}

/**
 * @param {Parameters<typeof readPlatformSession>[0] & Parameters<typeof defaultWithBrowserSession>[0]} env
 * @param {{ withBrowserSession?: typeof defaultWithBrowserSession; settleMs?: number; deadlineMs?: number; clock?: () => number }} [options]
 * @returns {Promise<import('./history-types.js').HistoryRecord[]>}
 */
export async function fetchJobKoreaHistory(
  env,
  {
    withBrowserSession = defaultWithBrowserSession,
    settleMs = SETTLE_TIMEOUT_MS,
    deadlineMs = ADAPTER_DEADLINE_MS,
    clock = Date.now,
  } = {}
) {
  const deadlineAt = clock() + deadlineMs;
  /** @param {string} next */
  const assertOpen = (next) => {
    if (clock() >= deadlineAt) {
      throw new HistorySyncError('TIMEOUT', `JobKorea history window closed before ${next}`);
    }
  };
  /** @type {{ pending(): string[] }} */
  let requests = { pending: () => [] };
  const work = (async () => {
    const cookieString = await readPlatformSession(env, 'jobkorea');
    if (!cookieString) {
      throw new HistorySyncError('SESSION_MISSING', 'No JobKorea session in KV (auth:jobkorea)');
    }
    // A slow session read or browser acquisition that finishes after the deadline must not
    // start browser work the caller has already been told timed out.
    assertOpen('the browser was acquired');
    return withBrowserSession(env, async (browser) => {
      assertOpen('the page was opened');
      // Attempts stop early enough for the bounded reads and the page close to fit as well.
      const deadline = Math.min(clock() + ADAPTER_BUDGET_MS, deadlineAt - 2 * settleMs);
      const page = await browser.newPage();
      try {
        requests = await restrictToJobKorea(page, BLOCKED_RESOURCE_TYPES);
        await page.setCookie(...toJobKoreaBrowserCookies(cookieString));
        /** @type {Map<string, import('./history-types.js').HistoryRecord>} */
        const records = new Map();
        const visited = new Set();
        const queue = [JOBKOREA_APPLY_LIST_URL];
        while (queue.length > 0 && visited.size < MAX_PAGES) {
          const url = /** @type {string} */ (queue.shift());
          if (visited.has(url)) continue;
          visited.add(url);
          const html = await loadPage(page, url, deadline, settleMs).catch((error) => {
            throw withPendingRequests(error, requests.pending());
          });
          if (!isApplyListPage(html)) {
            throw new HistorySyncError(
              'SESSION_EXPIRED',
              'JobKorea did not serve the applied list'
            );
          }
          for (const record of parseJobKoreaApplyList(html)) records.set(record.jobId, record);
          for (const href of parseJobKoreaPagerLinks(html)) {
            const next = sameSiteUrl(href, page.url());
            if (next) queue.push(next);
          }
        }
        return [...records.values()];
      } finally {
        await settleWithin(page.close(), settleMs);
      }
    });
  })();
  const outcome = await settleWithin(
    work.then(
      (records) => ({ records }),
      (error) => ({ error })
    ),
    deadlineMs
  );
  if (outcome === null) {
    const stalled = [...new Set(requests.pending())].join(', ') || 'none';
    throw new HistorySyncError(
      'TIMEOUT',
      `JobKorea history fetch gave up after ${deadlineMs} ms; pending: ${stalled}`
    );
  }
  if ('error' in outcome) throw outcome.error;
  return outcome.records;
}

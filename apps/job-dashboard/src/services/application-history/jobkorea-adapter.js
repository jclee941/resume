/**
 * @fileoverview Reads the owner's JobKorea application history. JobKorea only honors its session
 * inside a browser, so the KV cookies are replayed in a Browser Rendering page that opens the
 * applied-list page and nothing else: it never clicks, so no cancel/edit/apply control is touched.
 * @module services/application-history/jobkorea-adapter
 */
import { withBrowserSession as defaultWithBrowserSession } from '../browser-session.js';
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
const NAVIGATION_TIMEOUT_MS = 30_000;
const TIMEOUT_MESSAGE = /timeout/i;

/**
 * @param {string} href
 * @param {string} base
 * @returns {string | null} absolute https jobkorea.co.kr URL, or null for anything else
 */
function sameSiteUrl(href, base) {
  if (!URL.canParse(href, base)) return null;
  const url = new URL(href, base);
  const onSite = url.hostname === 'jobkorea.co.kr' || url.hostname.endsWith('.jobkorea.co.kr');
  return url.protocol === 'https:' && onSite ? url.toString() : null;
}

/**
 * JobKorea inside Browser Rendering sometimes stalls past the navigation timeout and then loads
 * fine on the next try, so one timed-out navigation is retried once.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string} url
 * @returns {Promise<void>}
 */
async function gotoWithRetry(page, url) {
  const options = {
    waitUntil: /** @type {const} */ ('domcontentloaded'),
    timeout: NAVIGATION_TIMEOUT_MS,
  };
  try {
    await page.goto(url, options);
  } catch (error) {
    if (!TIMEOUT_MESSAGE.test(error instanceof Error ? error.message : '')) throw error;
    await page.goto(url, options);
  }
}

/**
 * @param {Parameters<typeof readPlatformSession>[0] & Parameters<typeof defaultWithBrowserSession>[0]} env
 * @param {{ withBrowserSession?: typeof defaultWithBrowserSession }} [options]
 * @returns {Promise<import('./history-types.js').HistoryRecord[]>}
 */
export async function fetchJobKoreaHistory(
  env,
  { withBrowserSession = defaultWithBrowserSession } = {}
) {
  const cookieString = await readPlatformSession(env, 'jobkorea');
  if (!cookieString) {
    throw new HistorySyncError('SESSION_MISSING', 'No JobKorea session in KV (auth:jobkorea)');
  }
  return withBrowserSession(env, async (browser) => {
    const page = await browser.newPage();
    try {
      await page.setCookie(...toJobKoreaBrowserCookies(cookieString));
      /** @type {Map<string, import('./history-types.js').HistoryRecord>} */
      const records = new Map();
      const visited = new Set();
      const queue = [JOBKOREA_APPLY_LIST_URL];
      while (queue.length > 0 && visited.size < MAX_PAGES) {
        const url = /** @type {string} */ (queue.shift());
        if (visited.has(url)) continue;
        visited.add(url);
        await gotoWithRetry(page, url);
        const html = await page.content();
        if (!isApplyListPage(html)) {
          throw new HistorySyncError('SESSION_EXPIRED', 'JobKorea did not serve the applied list');
        }
        for (const record of parseJobKoreaApplyList(html)) records.set(record.jobId, record);
        for (const href of parseJobKoreaPagerLinks(html)) {
          const next = sameSiteUrl(href, page.url());
          if (next) queue.push(next);
        }
      }
      return [...records.values()];
    } finally {
      await page.close().catch(() => {});
    }
  });
}

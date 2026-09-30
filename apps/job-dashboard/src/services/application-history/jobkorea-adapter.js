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
const NAVIGATION_TIMEOUT_MS = 45_000;
/**
 * The history sync runs every platform under a 120 s cron budget (sync.js DEFAULT_TIMEOUT_MS).
 * Worst case for one page is two timed-out attempts (2 x 45 s = 90 s) plus two content reads.
 * Each attempt's timeout is also capped by what is left of this 110 s deadline, so a slow pager
 * page cannot run past the cron budget and the adapter fails on its own before sync.js gives up.
 */
const ADAPTER_BUDGET_MS = 110_000;
const TIMEOUT_MESSAGE = /timeout/i;
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet']);

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isJobKoreaHost(hostname) {
  return hostname === 'jobkorea.co.kr' || hostname.endsWith('.jobkorea.co.kr');
}

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
 * @param {import('@cloudflare/puppeteer').HTTPRequest} request
 * @returns {boolean} true for heavy resources and anything served from outside jobkorea.co.kr
 */
function shouldBlock(request) {
  if (BLOCKED_RESOURCE_TYPES.has(request.resourceType())) return true;
  const target = request.url();
  return !URL.canParse(target) || !isJobKoreaHost(new URL(target).hostname);
}

/**
 * Request-interception handler: third-party ad/analytics scripts and page weight are what push
 * the applied list past DOMContentLoaded, and the parser only needs the server-rendered HTML.
 * Never throws: a request that is already handled or a closed page must not fail the sync.
 * @param {import('@cloudflare/puppeteer').HTTPRequest} request
 * @returns {void}
 */
function handleRequest(request) {
  try {
    const settled = shouldBlock(request) ? request.abort() : request.continue();
    Promise.resolve(settled).catch(() => {});
  } catch {
    // Intentionally ignored, see above.
  }
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @returns {Promise<string | null>} current HTML, or null when it cannot be read
 */
async function readContent(page) {
  try {
    return await page.content();
  } catch {
    return null;
  }
}

/**
 * JobKorea inside Browser Rendering sometimes stalls past the navigation timeout. A timeout
 * whose document already is the applied list is good enough (the parser only needs the HTML);
 * otherwise the navigation is retried once, and the content is checked once more after the
 * retry times out before giving up.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string} url
 * @param {number} deadline epoch ms after which no further attempt may start
 * @returns {Promise<string>} the page HTML (not yet checked for being the applied list)
 */
async function loadPage(page, url, deadline) {
  /** @type {unknown} */
  let timedOut = new HistorySyncError('TIMEOUT', 'JobKorea sync budget exhausted');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const timeout = Math.min(NAVIGATION_TIMEOUT_MS, deadline - Date.now());
    if (timeout <= 0) break;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      return await page.content();
    } catch (error) {
      if (!TIMEOUT_MESSAGE.test(error instanceof Error ? error.message : '')) throw error;
      timedOut = error;
      const html = await readContent(page);
      if (html !== null && isApplyListPage(html)) return html;
    }
  }
  throw timedOut;
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
    const deadline = Date.now() + ADAPTER_BUDGET_MS;
    const page = await browser.newPage();
    try {
      await page.setRequestInterception(true);
      page.on('request', handleRequest);
      await page.setCookie(...toJobKoreaBrowserCookies(cookieString));
      /** @type {Map<string, import('./history-types.js').HistoryRecord>} */
      const records = new Map();
      const visited = new Set();
      const queue = [JOBKOREA_APPLY_LIST_URL];
      while (queue.length > 0 && visited.size < MAX_PAGES) {
        const url = /** @type {string} */ (queue.shift());
        if (visited.has(url)) continue;
        visited.add(url);
        const html = await loadPage(page, url, deadline);
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

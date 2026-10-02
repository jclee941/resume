/**
 * @fileoverview On-demand JobKorea history reads log in first, in the browser that reads. A stored
 * `auth:jobkorea` session keeps working in the Browser Rendering browser that minted it but can
 * stall JobKorea pages in others (2026-10-02: of three concurrent browsers, only the minting one
 * stayed logged in), and an admin or MCP sync usually gets another browser. The daily cron already
 * refreshes the session right before it syncs.
 * @module handlers/applications/jobkorea-history-login
 */
import { fetchJobKoreaHistory as defaultFetchHistory } from '../../services/application-history/jobkorea-adapter.js';
import { HistorySyncError } from '../../services/application-history/history-types.js';
import { withBrowserSession as defaultWithBrowserSession } from '../../services/browser-session.js';
import { refreshJobKoreaSession as defaultRefresh } from '../jobkorea/mint-session.js';

/**
 * Budget of the whole on-demand read from borrowing the browser on: the read gets only what the
 * login left, so the adapter reports its own TIMEOUT inside sync.js's 120 s fetch budget.
 */
export const AFTER_LOGIN_BUDGET_MS = 110_000;

/**
 * @param {Parameters<typeof defaultRefresh>[0] & Parameters<typeof defaultFetchHistory>[0]} env
 * @param {{
 *   withBrowserSession?: typeof defaultWithBrowserSession;
 *   refresh?: typeof defaultRefresh;
 *   fetchHistory?: typeof defaultFetchHistory;
 *   clock?: () => number;
 * }} [deps]
 * @returns {Promise<import('../../services/application-history/history-types.js').HistoryRecord[]>}
 */
export async function fetchJobKoreaHistoryAfterLogin(env, deps = {}) {
  const {
    withBrowserSession = defaultWithBrowserSession,
    refresh = defaultRefresh,
    fetchHistory = defaultFetchHistory,
    clock = Date.now,
  } = deps;
  const startedAt = clock();
  return withBrowserSession(env, async (browser) => {
    /** @type {typeof defaultWithBrowserSession} */
    const sameBrowser = (_env, fn) => fn(browser);
    // One attempt: retrying a stalled login page would leave the read no budget.
    const refreshed = await refresh(env, { withBrowserSession: sameBrowser, attempts: 1 });
    if (!refreshed.ok) {
      throw new HistorySyncError(
        'UPSTREAM_ERROR',
        `JobKorea login before the history read failed: ${refreshed.error}`
      );
    }
    const deadlineMs = AFTER_LOGIN_BUDGET_MS - (clock() - startedAt);
    if (deadlineMs <= 0) {
      throw new HistorySyncError(
        'TIMEOUT',
        `JobKorea login used the whole ${AFTER_LOGIN_BUDGET_MS} ms history budget`
      );
    }
    return fetchHistory(env, { withBrowserSession: sameBrowser, deadlineMs, clock });
  });
}

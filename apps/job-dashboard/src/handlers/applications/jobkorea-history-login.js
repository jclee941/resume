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
 * @param {Parameters<typeof defaultRefresh>[0] & Parameters<typeof defaultFetchHistory>[0]} env
 * @param {{
 *   withBrowserSession?: typeof defaultWithBrowserSession;
 *   refresh?: typeof defaultRefresh;
 *   fetchHistory?: typeof defaultFetchHistory;
 * }} [deps]
 * @returns {Promise<import('../../services/application-history/history-types.js').HistoryRecord[]>}
 */
export async function fetchJobKoreaHistoryAfterLogin(env, deps = {}) {
  const {
    withBrowserSession = defaultWithBrowserSession,
    refresh = defaultRefresh,
    fetchHistory = defaultFetchHistory,
  } = deps;
  return withBrowserSession(env, async (browser) => {
    /** @type {typeof defaultWithBrowserSession} */
    const sameBrowser = (_env, fn) => fn(browser);
    const refreshed = await refresh(env, { withBrowserSession: sameBrowser });
    if (!refreshed.ok) {
      throw new HistorySyncError(
        'UPSTREAM_ERROR',
        `JobKorea login before the history read failed: ${refreshed.error}`
      );
    }
    return fetchHistory(env, { withBrowserSession: sameBrowser });
  });
}

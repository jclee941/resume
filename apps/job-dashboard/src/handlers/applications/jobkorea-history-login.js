/**
 * @fileoverview On-demand JobKorea history reads log in first, in the browser that reads, and read
 * with that login's cookies. A stored `auth:jobkorea` session keeps working in the Browser
 * Rendering browser that minted it but can stall JobKorea pages in others (2026-10-02: of three
 * concurrent browsers, only the minting one stayed logged in), and an admin or MCP sync usually
 * gets another browser. The login is not stored: another login may replace `auth:jobkorea` at any
 * time, and the daily cron reads the stored session right after its own refresh.
 * @module handlers/applications/jobkorea-history-login
 */
import { fetchJobKoreaHistory as defaultFetchHistory } from '../../services/application-history/jobkorea-adapter.js';
import { HistorySyncError } from '../../services/application-history/history-types.js';
import {
  withBrowserSession as defaultWithBrowserSession,
  settleWithin,
} from '../../services/browser-session.js';
import { mintJobKoreaSession as defaultMint } from '../jobkorea/mint-session.js';

/**
 * Budget of the whole on-demand read from asking for a browser on. Nothing starts after it (a
 * browser that arrives late is handed back unused), the read gets only what the login left, and
 * the adapter answers TIMEOUT at it, inside sync.js's 120 s fetch budget.
 */
export const AFTER_LOGIN_BUDGET_MS = 110_000;

/**
 * @param {Parameters<typeof defaultMint>[0] & Parameters<typeof defaultFetchHistory>[0]} env
 * @param {{
 *   withBrowserSession?: typeof defaultWithBrowserSession;
 *   mint?: typeof defaultMint;
 *   fetchHistory?: typeof defaultFetchHistory;
 *   clock?: () => number;
 *   budgetMs?: number;
 * }} [deps]
 * @returns {Promise<import('../../services/application-history/history-types.js').HistoryRecord[]>}
 */
export async function fetchJobKoreaHistoryAfterLogin(env, deps = {}) {
  const {
    withBrowserSession = defaultWithBrowserSession,
    mint = defaultMint,
    fetchHistory = defaultFetchHistory,
    clock = Date.now,
    budgetMs = AFTER_LOGIN_BUDGET_MS,
  } = deps;
  const deadlineAt = clock() + budgetMs;
  /** @param {string} next */
  const assertOpen = (next) => {
    if (clock() >= deadlineAt) {
      throw new HistorySyncError('TIMEOUT', `JobKorea history window closed before ${next}`);
    }
  };
  const work = withBrowserSession(
    env,
    async (browser) => {
      assertOpen('the login started');
      /** @type {typeof defaultWithBrowserSession} */
      const sameBrowser = (_env, fn) => fn(browser);
      /** @type {string} */
      let session;
      try {
        session = await mint(env, { withBrowserSession: sameBrowser });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new HistorySyncError(
          'UPSTREAM_ERROR',
          `JobKorea login before the history read failed: ${reason}`
        );
      }
      const deadlineMs = deadlineAt - clock();
      if (deadlineMs <= 0) {
        throw new HistorySyncError(
          'TIMEOUT',
          `JobKorea login used the whole ${budgetMs} ms history budget`
        );
      }
      return fetchHistory(env, { withBrowserSession: sameBrowser, deadlineMs, clock, session });
    },
    { assertOpen }
  );
  const outcome = await settleWithin(
    work.then(
      (records) => ({ records }),
      (error) => ({ error })
    ),
    budgetMs
  );
  if (outcome === null) {
    throw new HistorySyncError('TIMEOUT', `JobKorea history read gave up after ${budgetMs} ms`);
  }
  if ('error' in outcome) throw outcome.error;
  return outcome.records;
}

/**
 * @fileoverview Pure, dependency-injected logic for the Cloudflare Browser
 * Rendering session broker (CF-native migration, Wave 2). Kept free of Durable
 * Object / runtime concerns so it is fully unit-testable with a fake puppeteer.
 *
 * Model (per @cloudflare/puppeteer):
 *  - puppeteer.sessions(endpoint)  -> ActiveSession[]  (free == no connectionId)
 *  - puppeteer.limits(endpoint)    -> { activeSessions[], maxConcurrentSessions,
 *                                       allowedBrowserAcquisitions, ... }
 *  - puppeteer.acquire(endpoint, { keep_alive }) -> { sessionId }
 *  - caller then puppeteer.connect(endpoint, sessionId) to use it
 *
 * NOTE: runtime session-connect / concurrency behaviour can only be confirmed
 * against live Browser Rendering; these functions encode the documented contract.
 * @module durable-objects/browser-session-broker
 */

export const DEFAULT_KEEP_ALIVE_MS = 60_000;

/**
 * Find a reusable session: active, with no worker connection (no connectionId),
 * and not already locked by this broker.
 * @param {Array<{sessionId:string, connectionId?:string}>} sessions
 * @param {Set<string>|Map<string, unknown>} locked
 * @returns {{sessionId:string}|null}
 */
export function pickFreeSession(sessions, locked) {
  const has = (id) => (typeof locked.has === 'function' ? locked.has(id) : false);
  for (const s of sessions || []) {
    if (s && s.sessionId && !s.connectionId && !has(s.sessionId)) return s;
  }
  return null;
}

/**
 * Whether a fresh session may be launched given current account limits and how
 * many sessions this broker already holds locked.
 * @param {{activeSessions:Array<unknown>, maxConcurrentSessions:number, allowedBrowserAcquisitions:number}} limits
 * @param {number} lockedSize
 * @returns {boolean}
 */
export function canLaunch(limits, lockedSize = 0) {
  if (!limits) return false;
  const active = Array.isArray(limits.activeSessions) ? limits.activeSessions.length : 0;
  const maxConcurrent = Number(limits.maxConcurrentSessions ?? 0);
  const allowed = Number(limits.allowedBrowserAcquisitions ?? 0);
  return allowed > 0 && Math.max(active, lockedSize) < maxConcurrent;
}

/**
 * Acquire a connectable sessionId — reuse a free session if one exists, else
 * launch a new one when limits allow.
 * @param {{sessions:Function, limits:Function, acquire:Function}} puppeteer
 * @param {unknown} endpoint - the MYBROWSER binding
 * @param {Set<string>|Map<string, unknown>} locked
 * @param {{keepAlive?:number}} [opts]
 * @returns {Promise<{sessionId:string, reused:boolean}>}
 */
export async function acquireSession(puppeteer, endpoint, locked, opts = {}) {
  const keepAlive = opts.keepAlive ?? DEFAULT_KEEP_ALIVE_MS;

  const sessions = await puppeteer.sessions(endpoint);
  const free = pickFreeSession(sessions, locked);
  if (free) return { sessionId: free.sessionId, reused: true };

  const limits = await puppeteer.limits(endpoint);
  const lockedSize = typeof locked.size === 'number' ? locked.size : 0;
  if (!canLaunch(limits, lockedSize)) {
    const err = new Error('Browser Rendering capacity reached');
    err.code = 'NO_CAPACITY';
    throw err;
  }

  const { sessionId } = await puppeteer.acquire(endpoint, { keep_alive: keepAlive });
  return { sessionId, reused: false };
}

/**
 * Reconcile locked session ids against the sessions that still exist upstream,
 * dropping locks whose session has gone away.
 * @param {Iterable<string>} lockedIds
 * @param {Array<{sessionId:string}>} sessions
 * @returns {string[]} sessionIds to drop
 */
export function staleLocks(lockedIds, sessions) {
  const live = new Set((sessions || []).map((s) => s && s.sessionId).filter(Boolean));
  const stale = [];
  for (const id of lockedIds) if (!live.has(id)) stale.push(id);
  return stale;
}

/**
 * @fileoverview Durable Object for Cloudflare Browser Rendering session
 * pooling (CF-native migration, Wave 2). Hands out REAL connectable
 * @cloudflare/puppeteer session ids via the pure broker in
 * ./browser-session-broker.js — reusing a free upstream session when one
 * exists, otherwise launching a new one within account limits.
 *
 * This Durable Object has ZERO callers as of Wave 2 (additive only). Live
 * Browser Rendering behaviour — cross-worker session-connect, keep_alive
 * reuse, and concurrency accounting — is NOT yet verified against the real
 * Cloudflare runtime, only unit-tested with a fake puppeteer. Wave 3 wires a
 * real crawler through handlers/browser/browser-service.js after that
 * validation happens.
 *
 * Binding: BROWSER_SESSION in wrangler.jsonc
 * @module durable-objects/browser-session-do
 */

import puppeteer from '@cloudflare/puppeteer';
import { acquireSession, staleLocks, DEFAULT_KEEP_ALIVE_MS } from './browser-session-broker.js';

const LOCKED_KEY = 'locked';

export class BrowserSessionDO {
  /** @type {DurableObjectState} */
  #state;
  /** @type {Map<string, {requestId:string, lockedAt:number}>} */
  #locked = new Map();
  /** @type {Promise<void>} */
  #ready;

  /**
   * @param {DurableObjectState} state
   * @param {Record<string, unknown>} env
   */
  constructor(state, env) {
    this.#state = state;
    this.env = env;
    this.#ready = state.blockConcurrencyWhile(async () => {
      const stored = await state.storage.get(LOCKED_KEY);
      if (stored) this.#locked = new Map(stored);
    });
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    await this.#ready;
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();

    try {
      switch (action) {
        case 'acquire':
          return await this.#handleAcquire(request);
        case 'release':
          return await this.#handleRelease(request);
        case 'status':
          return await this.#handleStatus();
        case 'destroy':
          return await this.#handleDestroy();
        default:
          return Response.json({ error: 'Unknown action' }, { status: 400 });
      }
    } catch (err) {
      const status = err.code === 'NO_CAPACITY' ? 429 : 500;
      return Response.json(
        { error: err.message, ...(err.code ? { code: err.code } : {}) },
        { status }
      );
    }
  }

  /**
   * Acquire a connectable sessionId — reused or freshly launched via the broker.
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async #handleAcquire(request) {
    const body = await request.json().catch(() => ({}));
    const requestId = body.requestId || crypto.randomUUID();
    const keepAlive = body.keepAlive ?? DEFAULT_KEEP_ALIVE_MS;

    const lockedIds = new Set(this.#locked.keys());
    const { sessionId, reused } = await acquireSession(puppeteer, this.env.MYBROWSER, lockedIds, {
      keepAlive,
    });

    this.#locked.set(sessionId, { requestId, lockedAt: Date.now() });
    await this.#persist();
    await this.#state.storage.setAlarm(Date.now() + keepAlive);

    return Response.json({ sessionId, reused, activeLocks: this.#locked.size });
  }

  /**
   * Release a locked session. Does NOT close the browser — keep_alive governs
   * its lifetime upstream and other callers may reuse the same session.
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async #handleRelease(request) {
    const { sessionId } = await request.json();
    this.#locked.delete(sessionId);
    await this.#persist();
    return Response.json({ released: true });
  }

  /**
   * Report locked ids plus upstream sessions/limits. Never throws — each
   * upstream call is individually guarded.
   * @returns {Promise<Response>}
   */
  async #handleStatus() {
    let sessions;
    let limits;

    try {
      sessions = await puppeteer.sessions(this.env.MYBROWSER);
    } catch {
      sessions = null;
    }

    try {
      limits = await puppeteer.limits(this.env.MYBROWSER);
    } catch {
      limits = null;
    }

    return Response.json({ locked: [...this.#locked.keys()], sessions, limits });
  }

  /**
   * Force-clear all locks and storage for this Durable Object instance.
   * @returns {Promise<Response>}
   */
  async #handleDestroy() {
    this.#locked.clear();
    await this.#state.storage.deleteAll();
    return Response.json({ destroyed: true });
  }

  /** Persist the current locked map to durable storage. */
  async #persist() {
    await this.#state.storage.put(LOCKED_KEY, [...this.#locked.entries()]);
  }

  /**
   * Reconcile locked ids against upstream sessions, dropping locks whose
   * session has gone away. Reschedules itself only while locks remain.
   */
  async alarm() {
    let sessions;
    try {
      sessions = await puppeteer.sessions(this.env.MYBROWSER);
    } catch {
      sessions = [];
    }

    const stale = staleLocks(this.#locked.keys(), sessions);
    for (const id of stale) this.#locked.delete(id);
    if (stale.length) await this.#persist();

    if (this.#locked.size > 0) {
      await this.#state.storage.setAlarm(Date.now() + DEFAULT_KEEP_ALIVE_MS);
    }
  }
}

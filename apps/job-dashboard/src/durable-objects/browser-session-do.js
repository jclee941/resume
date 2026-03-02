/**
 * @fileoverview Durable Object for browser session pooling.
 * Manages @cloudflare/puppeteer browser lifecycle with keep-alive,
 * idle timeout, and concurrent session limits.
 *
 * Binding: BROWSER_SESSION in wrangler.jsonc
 * @module durable-objects/browser-session-do
 */

import puppeteer from '@cloudflare/puppeteer';

const MAX_CONCURRENT = 2;
const IDLE_TIMEOUT_MS = 60_000;
const KEEP_ALIVE_MS = 10_000;

/**
 * @typedef {Object} SessionState
 * @property {string} id
 * @property {'idle'|'active'|'closing'} status
 * @property {number} createdAt
 * @property {number} lastUsedAt
 * @property {string|null} lockedBy
 */

export class BrowserSessionDO {
  /** @type {DurableObjectState} */
  #state;
  /** @type {import('@cloudflare/puppeteer').Browser|null} */
  #browser = null;
  /** @type {Map<string, SessionState>} */
  #sessions = new Map();
  /** @type {number} */
  #activeCount = 0;

  /**
   * @param {DurableObjectState} state
   * @param {Record<string, unknown>} env
   */
  constructor(state, env) {
    this.#state = state;
    this.env = env;
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();

    try {
      switch (action) {
        case 'acquire':
          return await this.#handleAcquire(request);
        case 'release':
          return await this.#handleRelease(request);
        case 'status':
          return this.#handleStatus();
        case 'destroy':
          return await this.#handleDestroy();
        default:
          return new Response(JSON.stringify({ error: 'Unknown action' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
      }
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  /**
   * Acquire a browser session. Returns websocket endpoint if available.
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async #handleAcquire(request) {
    const body = await request.json();
    const requestId = body.requestId || crypto.randomUUID();

    if (this.#activeCount >= MAX_CONCURRENT) {
      return Response.json(
        { error: 'Max concurrent sessions reached', limit: MAX_CONCURRENT },
        { status: 429 }
      );
    }

    if (!this.#browser) {
      this.#browser = await puppeteer.launch(this.env.MYBROWSER);
    }

    const sessionId = crypto.randomUUID();
    const now = Date.now();

    /** @type {SessionState} */
    const session = {
      id: sessionId,
      status: 'active',
      createdAt: now,
      lastUsedAt: now,
      lockedBy: requestId,
    };

    this.#sessions.set(sessionId, session);
    this.#activeCount++;

    await this.#state.storage.put('sessions', [...this.#sessions.entries()]);
    this.#scheduleIdleCheck();

    return Response.json({
      sessionId,
      browserConnected: !!this.#browser,
      activeCount: this.#activeCount,
    });
  }

  /**
   * Release a session back to pool.
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async #handleRelease(request) {
    const { sessionId } = await request.json();
    const session = this.#sessions.get(sessionId);

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    session.status = 'idle';
    session.lockedBy = null;
    session.lastUsedAt = Date.now();
    this.#activeCount = Math.max(0, this.#activeCount - 1);

    await this.#state.storage.put('sessions', [...this.#sessions.entries()]);
    this.#scheduleIdleCheck();

    return Response.json({ released: true, activeCount: this.#activeCount });
  }

  /** @returns {Response} */
  #handleStatus() {
    const sessions = [...this.#sessions.values()].map(({ id, status, createdAt, lastUsedAt }) => ({
      id,
      status,
      createdAt,
      lastUsedAt,
      age: Date.now() - createdAt,
    }));

    return Response.json({
      browserConnected: !!this.#browser,
      activeCount: this.#activeCount,
      totalSessions: this.#sessions.size,
      sessions,
    });
  }

  /**
   * Force-close all sessions and disconnect browser.
   * @returns {Promise<Response>}
   */
  async #handleDestroy() {
    if (this.#browser) {
      try {
        await this.#browser.close();
      } catch {
        // noop — browser may already be disconnected
      }
      this.#browser = null;
    }

    this.#sessions.clear();
    this.#activeCount = 0;
    await this.#state.storage.deleteAll();

    return Response.json({ destroyed: true });
  }

  /** Schedule alarm for idle session cleanup. */
  #scheduleIdleCheck() {
    const nextCheck = Date.now() + KEEP_ALIVE_MS;
    this.#state.storage.setAlarm(nextCheck);
  }

  /** Durable Object alarm handler — evicts idle sessions. */
  async alarm() {
    const now = Date.now();
    let changed = false;

    for (const [id, session] of this.#sessions) {
      if (session.status === 'idle' && now - session.lastUsedAt > IDLE_TIMEOUT_MS) {
        this.#sessions.delete(id);
        changed = true;
      }
    }

    if (changed) {
      await this.#state.storage.put('sessions', [...this.#sessions.entries()]);
    }

    if (this.#sessions.size === 0 && this.#browser) {
      try {
        await this.#browser.close();
      } catch {
        // noop
      }
      this.#browser = null;
    }

    if (this.#sessions.size > 0) {
      this.#scheduleIdleCheck();
    }
  }
}

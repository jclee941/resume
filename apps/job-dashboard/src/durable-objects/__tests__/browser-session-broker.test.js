import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_KEEP_ALIVE_MS,
  pickFreeSession,
  canLaunch,
  acquireSession,
  staleLocks,
} from '../browser-session-broker.js';

describe('pickFreeSession', () => {
  it('returns null when there are no sessions', () => {
    assert.equal(pickFreeSession([], new Set()), null);
    assert.equal(pickFreeSession(undefined, new Set()), null);
  });

  it('skips sessions that have a connectionId (already connected)', () => {
    const sessions = [{ sessionId: 'a', connectionId: 'conn-1' }, { sessionId: 'b' }];
    const result = pickFreeSession(sessions, new Set());
    assert.deepEqual(result, { sessionId: 'b' });
  });

  it('skips sessions that are already locked', () => {
    const sessions = [{ sessionId: 'a' }, { sessionId: 'b' }];
    const result = pickFreeSession(sessions, new Set(['a']));
    assert.deepEqual(result, { sessionId: 'b' });
  });

  it('returns null when every free session is locked or connected', () => {
    const sessions = [{ sessionId: 'a', connectionId: 'conn-1' }, { sessionId: 'b' }];
    assert.equal(pickFreeSession(sessions, new Set(['b'])), null);
  });

  it('works with a Map for locked (uses .has)', () => {
    const sessions = [{ sessionId: 'a' }];
    const locked = new Map([['a', { requestId: 'r1' }]]);
    assert.equal(pickFreeSession(sessions, locked), null);
  });
});

describe('canLaunch', () => {
  it('returns false when limits is missing', () => {
    assert.equal(canLaunch(null), false);
    assert.equal(canLaunch(undefined), false);
  });

  it('returns false when allowedBrowserAcquisitions is 0', () => {
    const limits = { activeSessions: [], maxConcurrentSessions: 5, allowedBrowserAcquisitions: 0 };
    assert.equal(canLaunch(limits, 0), false);
  });

  it('returns true when under maxConcurrentSessions and acquisitions are allowed', () => {
    const limits = { activeSessions: [{ id: '1' }], maxConcurrentSessions: 5, allowedBrowserAcquisitions: 3 };
    assert.equal(canLaunch(limits, 1), true);
  });

  it('returns false when locked size already meets maxConcurrentSessions', () => {
    const limits = { activeSessions: [], maxConcurrentSessions: 2, allowedBrowserAcquisitions: 3 };
    assert.equal(canLaunch(limits, 2), false);
  });

  it('returns false when active sessions already meet maxConcurrentSessions', () => {
    const limits = {
      activeSessions: [{ id: '1' }, { id: '2' }],
      maxConcurrentSessions: 2,
      allowedBrowserAcquisitions: 3,
    };
    assert.equal(canLaunch(limits, 0), false);
  });

  it('takes the max of active session count and locked size', () => {
    const limits = { activeSessions: [{ id: '1' }], maxConcurrentSessions: 3, allowedBrowserAcquisitions: 1 };
    assert.equal(canLaunch(limits, 2), true);
    assert.equal(canLaunch(limits, 3), false);
  });
});

describe('acquireSession', () => {
  it('reuses a free session without calling acquire()', async () => {
    const puppeteer = {
      sessions: mock.fn(async () => [{ sessionId: 'free-1' }]),
      limits: mock.fn(async () => ({ activeSessions: [], maxConcurrentSessions: 5, allowedBrowserAcquisitions: 5 })),
      acquire: mock.fn(async () => ({ sessionId: 'should-not-be-used' })),
    };

    const result = await acquireSession(puppeteer, 'endpoint', new Set());

    assert.deepEqual(result, { sessionId: 'free-1', reused: true });
    assert.equal(puppeteer.acquire.mock.calls.length, 0);
  });

  it('launches a new session via acquire() when none are free', async () => {
    const puppeteer = {
      sessions: mock.fn(async () => []),
      limits: mock.fn(async () => ({ activeSessions: [], maxConcurrentSessions: 5, allowedBrowserAcquisitions: 5 })),
      acquire: mock.fn(async (_endpoint, opts) => {
        assert.equal(opts.keep_alive, DEFAULT_KEEP_ALIVE_MS);
        return { sessionId: 'new-1' };
      }),
    };

    const result = await acquireSession(puppeteer, 'endpoint', new Set());

    assert.deepEqual(result, { sessionId: 'new-1', reused: false });
    assert.equal(puppeteer.acquire.mock.calls.length, 1);
  });

  it('passes a custom keepAlive through to acquire()', async () => {
    const puppeteer = {
      sessions: mock.fn(async () => []),
      limits: mock.fn(async () => ({ activeSessions: [], maxConcurrentSessions: 5, allowedBrowserAcquisitions: 5 })),
      acquire: mock.fn(async (_endpoint, opts) => ({ sessionId: 'new-2', keepAliveSeen: opts.keep_alive })),
    };

    await acquireSession(puppeteer, 'endpoint', new Set(), { keepAlive: 30_000 });

    assert.equal(puppeteer.acquire.mock.calls[0].arguments[1].keep_alive, 30_000);
  });

  it('throws NO_CAPACITY when at the concurrency cap', async () => {
    const puppeteer = {
      sessions: mock.fn(async () => []),
      limits: mock.fn(async () => ({ activeSessions: [{ id: '1' }], maxConcurrentSessions: 1, allowedBrowserAcquisitions: 5 })),
      acquire: mock.fn(async () => ({ sessionId: 'unused' })),
    };

    await assert.rejects(
      () => acquireSession(puppeteer, 'endpoint', new Set()),
      (err) => {
        assert.equal(err.code, 'NO_CAPACITY');
        return true;
      }
    );
    assert.equal(puppeteer.acquire.mock.calls.length, 0);
  });

  it('treats locked sessions as unavailable for reuse even if the endpoint reports them free', async () => {
    const puppeteer = {
      sessions: mock.fn(async () => [{ sessionId: 'a' }]),
      limits: mock.fn(async () => ({ activeSessions: [{ id: 'a' }], maxConcurrentSessions: 1, allowedBrowserAcquisitions: 5 })),
      acquire: mock.fn(async () => ({ sessionId: 'unused' })),
    };

    await assert.rejects(() => acquireSession(puppeteer, 'endpoint', new Set(['a'])), {
      code: 'NO_CAPACITY',
    });
  });
});

describe('staleLocks', () => {
  it('returns locked ids that no longer exist upstream', () => {
    const result = staleLocks(['a', 'b', 'c'], [{ sessionId: 'a' }, { sessionId: 'c' }]);
    assert.deepEqual(result, ['b']);
  });

  it('returns an empty array when all locked ids are still live', () => {
    const result = staleLocks(['a'], [{ sessionId: 'a' }]);
    assert.deepEqual(result, []);
  });

  it('handles an empty/undefined sessions list', () => {
    assert.deepEqual(staleLocks(['a'], []), ['a']);
    assert.deepEqual(staleLocks(['a'], undefined), ['a']);
  });
});

import assert from 'node:assert/strict';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { dirname } from 'node:path';
import { describe, it, beforeEach, mock } from 'node:test';

const require = createRequire(import.meta.url);
const fsCjs = require('fs');
const osCjs = require('os');

mock.method(osCjs, 'homedir', () => '/home/tester');
syncBuiltinESMExports();
process.env.RESUME_BASE_PATH = '/home/tester/dev/resume';
const { SessionManager } = await import('../session-manager.js');

function createFsState(initialFiles = {}) {
  const files = new Map(Object.entries(initialFiles));
  const dirs = new Set();
  for (const filePath of files.keys()) dirs.add(dirname(filePath));
  return {
    files,
    dirs,
    existsSync: (targetPath) => files.has(targetPath) || dirs.has(targetPath),
    readFileSync: (targetPath) => {
      if (!files.has(targetPath)) throw new Error(`ENOENT: ${targetPath}`);
      return files.get(targetPath);
    },
    writeFileSync: (targetPath, data) => {
      files.set(targetPath, String(data));
      dirs.add(dirname(targetPath));
    },
    mkdirSync: (targetPath) => {
      dirs.add(targetPath);
    },
  };
}

function setupFs(options = {}) {
  const state = createFsState(options.files ?? {});
  mock.method(fsCjs, 'existsSync', options.existsSync ?? state.existsSync);
  mock.method(fsCjs, 'readFileSync', options.readFileSync ?? state.readFileSync);
  mock.method(fsCjs, 'writeFileSync', options.writeFileSync ?? state.writeFileSync);
  mock.method(fsCjs, 'mkdirSync', options.mkdirSync ?? state.mkdirSync);
  syncBuiltinESMExports();
  return {
    state,
    sessionFile: '/home/tester/dev/resume/sessions.json',
    dataDir: '/home/tester/dev/resume',
  };
}

function createMemoryStore(initialSessions = {}) {
  const sessions = structuredClone(initialSessions);
  return {
    load(platform = null) {
      if (!platform) return sessions;
      return sessions[platform] ?? null;
    },
    save(platform, session) {
      sessions[platform] = session;
      return true;
    },
    clear(platform = null) {
      if (!platform) {
        for (const key of Object.keys(sessions)) delete sessions[key];
        return true;
      }
      delete sessions[platform];
      return true;
    },
  };
}

describe('SessionManager', () => {
  beforeEach(() => {
    mock.restoreAll();
    SessionManager.configure();
    syncBuiltinESMExports();
  });

  it('supports constructor-injected dependencies without static adapter state', async () => {
    const store = createMemoryStore({ wanted: { cookieString: 'a=1', timestamp: Date.now() } });
    const api = { setCookies: mock.fn() };
    const manager = new SessionManager({
      store,
      apiFactory: (session) => {
        api.setCookies(session.cookieString);
        return api;
      },
      refreshRunner: (platform) => {
        store.save(platform, { timestamp: Date.now() });
      },
    });

    assert.equal(manager.load('wanted').cookieString, 'a=1');
    assert.equal(await manager.getAPI('wanted'), api);
    assert.equal(api.setCookies.mock.callCount(), 1);

    assert.equal(manager.save('saramin', { token: 'x' }), true);
    assert.equal(store.load('saramin').token, 'x');
    assert.equal(await manager.tryRefresh('wanted'), true);
    assert.equal(SessionManager.load('wanted'), null);
  });

  it('allows static compatibility adapter reconfiguration', () => {
    const store = createMemoryStore({ wanted: { timestamp: Date.now(), email: 'di@example.com' } });
    const manager = SessionManager.configure({ store });

    assert.equal(manager, SessionManager.getInstance());
    assert.equal(SessionManager.load('wanted').email, 'di@example.com');
    assert.equal(SessionManager.save('jobkorea', { token: 'token-value' }), true);
    assert.equal(store.load('jobkorea').token, 'token-value');
  });

  it('loads null or empty sessions when file is missing', () => {
    setupFs();
    assert.equal(SessionManager.load('wanted'), null);
    assert.deepEqual(SessionManager.load(), {});
  });

  it('loads valid, expired, and all-platform sessions', () => {
    const now = Date.now();
    setupFs({
      files: {
        '/home/tester/dev/resume/sessions.json': JSON.stringify({
          wanted: { timestamp: now - 1000, email: 'w@example.com' },
          saramin: { timestamp: now - 8 * 24 * 60 * 60 * 1000, email: 's@example.com' },
        }),
      },
    });

    assert.equal(SessionManager.load('wanted').email, 'w@example.com');
    assert.equal(SessionManager.load('saramin'), null);
    assert.deepEqual(Object.keys(SessionManager.load()).sort(), ['saramin', 'wanted']);
  });

  it('returns fallback when session file is malformed', () => {
    setupFs({
      files: {
        '/home/tester/dev/resume/sessions.json': '{bad-json',
      },
    });
    SessionManager.logger = { error: mock.fn() };

    assert.equal(SessionManager.load('wanted'), null);
    assert.deepEqual(SessionManager.load(), {});
    assert.equal(SessionManager.logger.error.mock.callCount(), 2);
  });

  it('saves normalized session from cookie string and creates directory', () => {
    const { state, sessionFile, dataDir } = setupFs();
    const ok = SessionManager.save('wanted', { cookies: 'a=1; b=2', email: 'u@example.com' });

    assert.equal(ok, true);
    assert.equal(fsCjs.mkdirSync.mock.callCount(), 1);
    assert.equal(fsCjs.mkdirSync.mock.calls[0].arguments[0], dataDir);
    const saved = JSON.parse(state.files.get(sessionFile));
    assert.equal(saved.wanted.platform, 'wanted');
    assert.equal(saved.wanted.cookies, null);
    assert.equal(saved.wanted.cookieString, 'a=1; b=2');
    assert.equal(saved.wanted.cookieCount, 2);
    assert.ok(typeof saved.wanted.expiresAt === 'string');
  });

  it('saves normalized session from cookie array with provided fields', () => {
    const expiresAt = new Date(Date.now() + 5000).toISOString();
    const { state, sessionFile } = setupFs();

    const ok = SessionManager.save('saramin', {
      cookies: [
        { name: 'sid', value: 'abc' },
        { name: 'csrf', value: 'xyz' },
      ],
      cookieCount: 99,
      expiresAt,
    });

    assert.equal(ok, true);
    const saved = JSON.parse(state.files.get(sessionFile));
    assert.equal(saved.saramin.cookieString, 'sid=abc; csrf=xyz');
    assert.equal(saved.saramin.cookieCount, 99);
    assert.equal(saved.saramin.expiresAt, expiresAt);

    const okAutoCount = SessionManager.save('jobkorea', {
      cookies: [{ name: 'a', value: '1' }],
    });
    assert.equal(okAutoCount, true);
    const withAutoCount = JSON.parse(state.files.get(sessionFile));
    assert.equal(withAutoCount.jobkorea.cookieCount, 1);
  });

  it('uses default ttl for unknown platform when saving session', () => {
    const { state, sessionFile } = setupFs();

    const start = Date.now();
    const ok = SessionManager.save('unknown-platform', { token: 'x' });
    const end = Date.now();

    assert.equal(ok, true);
    const saved = JSON.parse(state.files.get(sessionFile));
    const expiresAtMs = new Date(saved['unknown-platform'].expiresAt).getTime();
    assert.ok(expiresAtMs >= start + 24 * 60 * 60 * 1000);
    assert.ok(expiresAtMs <= end + 24 * 60 * 60 * 1000);
  });

  it('fails to save when write throws', () => {
    setupFs({
      writeFileSync: () => {
        throw new Error('write-fail');
      },
    });
    SessionManager.logger = { error: mock.fn() };

    assert.equal(SessionManager.save('wanted', { token: 'x' }), false);
    assert.equal(SessionManager.logger.error.mock.callCount(), 1);
  });

  it('clears one platform, all platforms, and missing file', () => {
    const now = Date.now();
    const { state, sessionFile } = setupFs({
      files: {
        '/home/tester/dev/resume/sessions.json': JSON.stringify({
          wanted: { timestamp: now },
          saramin: { timestamp: now },
        }),
      },
    });

    assert.equal(SessionManager.clear('wanted'), true);
    assert.deepEqual(Object.keys(JSON.parse(state.files.get(sessionFile))), ['saramin']);

    assert.equal(SessionManager.clear(), true);
    assert.equal(state.files.get(sessionFile), '{}');

    setupFs();
    assert.equal(SessionManager.clear('wanted'), true);
  });

  it('returns false when clear fails', () => {
    setupFs({
      existsSync: () => true,
      writeFileSync: () => {
        throw new Error('clear-fail');
      },
    });
    SessionManager.logger = { error: mock.fn() };

    assert.equal(SessionManager.clear(), false);
    assert.equal(SessionManager.logger.error.mock.callCount(), 1);
  });

  it('returns api client for cookieString, array cookies, token, and null paths', async () => {
    const wantedModule = await import('../../../clients/wanted/index.js');
    const setCookiesMock = mock.method(wantedModule.default.prototype, 'setCookies', () => {});
    SessionManager.configure({
      store: createMemoryStore({
        wanted: { cookieString: 'a=1; b=2' },
        saramin: { cookies: [{ name: 'sid', value: 'abc' }] },
        jobkorea: { token: 'token-value' },
        linkedin: { email: 'no-auth' },
      }),
    });

    assert.ok(await SessionManager.getAPI('wanted'));
    assert.ok(await SessionManager.getAPI('saramin'));
    assert.ok(await SessionManager.getAPI('jobkorea'));
    assert.equal(await SessionManager.getAPI('linkedin'), null);
    assert.equal(await SessionManager.getAPI('remember'), null);
    assert.equal(setCookiesMock.mock.callCount(), 3);
    assert.equal(setCookiesMock.mock.calls[0].arguments[0], 'a=1; b=2');
    assert.equal(setCookiesMock.mock.calls[1].arguments[0], 'sid=abc');
    assert.equal(setCookiesMock.mock.calls[2].arguments[0], 'token-value');
  });

  it('returns platform auth status list', () => {
    const now = Date.now();
    SessionManager.configure({
      store: createMemoryStore({
        wanted: { timestamp: now - 1000, email: 'wanted@example.com' },
        saramin: { timestamp: now - 20 * 24 * 60 * 60 * 1000, email: 'saramin@example.com' },
        jobkorea: { timestamp: now - 1000 },
      }),
    });

    const status = SessionManager.getStatus();
    const wanted = status.find((s) => s.platform === 'wanted');
    const saramin = status.find((s) => s.platform === 'saramin');
    const linkedin = status.find((s) => s.platform === 'linkedin');

    assert.equal(status.length, 5);
    assert.equal(wanted.authenticated, true);
    assert.equal(saramin.authenticated, false);
    assert.equal(linkedin.expiresAt, null);
  });

  it('returns status list when load() is falsy', () => {
    SessionManager.configure({ store: { load: () => null } });

    const status = SessionManager.getStatus();

    assert.equal(status.length, 5);
    assert.ok(status.every((item) => item.authenticated === false));
    assert.ok(status.every((item) => item.expiresAt === null));
  });

  it('checks health for missing, valid, expired, and expiring sessions', () => {
    const now = Date.now();
    SessionManager.configure({
      store: createMemoryStore({
        valid: { timestamp: now - 60 * 1000 },
        expired: { timestamp: now - 8 * 24 * 60 * 60 * 1000 },
        soon: { timestamp: now - (24 * 60 * 60 * 1000 - 60 * 1000) },
      }),
    });

    const missing = SessionManager.checkHealth('missing');
    const valid = SessionManager.checkHealth('valid');
    const expired = SessionManager.checkHealth('expired');
    const soon = SessionManager.checkHealth('soon', 2 * 60 * 1000);

    assert.deepEqual(missing, {
      valid: false,
      expiringSoon: false,
      expiresAt: null,
      reason: 'no_session',
    });
    assert.equal(valid.valid, true);
    assert.equal(valid.expiringSoon, false);
    assert.equal(expired.valid, false);
    assert.equal(soon.valid, true);
    assert.equal(soon.expiringSoon, true);
  });

  it('tries refresh success and failure', async () => {
    const logger = { error: mock.fn() };
    const store = createMemoryStore();
    let refreshShouldFail = false;
    SessionManager.configure({
      logger,
      store,
      refreshRunner: (platform) => {
        if (refreshShouldFail) throw new Error('cdp-failed');
        store.save(platform, { timestamp: Date.now() });
      },
    });

    assert.equal(await SessionManager.tryRefresh('wanted'), true);
    refreshShouldFail = true;
    assert.equal(await SessionManager.tryRefresh('wanted'), false);
    assert.equal(logger.error.mock.callCount(), 1);
  });
});

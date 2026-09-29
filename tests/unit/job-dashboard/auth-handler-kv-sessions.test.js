const path = require('node:path');
const { TEST_ENCRYPTION_KEY, encryptSession } = require('./platform-session-fixtures');

const modulePath = path.join(__dirname, '../../../apps/job-dashboard/src/handlers/auth.js');
const cryptoPath = path.join(__dirname, '../../../packages/shared/src/crypto/index.js');
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function createKv(entries = {}) {
  const store = new Map(Object.entries(entries));
  return {
    store,
    async get(key) {
      return store.get(key)?.value ?? null;
    },
    async put(key, value, options = {}) {
      const expiration = options.expirationTtl
        ? Math.floor(Date.now() / 1000) + options.expirationTtl
        : undefined;
      store.set(key, { value, expiration, metadata: options.metadata });
    },
    async delete(key) {
      store.delete(key);
    },
    async list({ prefix = '' } = {}) {
      const keys = [...store.entries()]
        .filter(([name]) => name.startsWith(prefix))
        .map(([name, entry]) => ({ name, expiration: entry.expiration, metadata: entry.metadata }));
      return { keys };
    },
  };
}

function createForbiddenDb() {
  return {
    prepare() {
      throw new Error('platform sessions must not touch D1');
    },
  };
}

function createEnv(kv) {
  return {
    ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
    SESSIONS: kv,
    JOB_DB: createForbiddenDb(),
  };
}

function jsonRequest(body, headers = {}) {
  return new Request('https://resume.jclee.me/job/api/auth/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('AuthHandler keeps platform sessions only in KV', () => {
  let AuthHandler;
  let decrypt;

  beforeAll(async () => {
    ({ AuthHandler } = await import(modulePath));
    ({ decrypt } = await import(cryptoPath));
  });

  const createHandler = (env) => new AuthHandler(env);

  test('status lists KV sessions and only counts decryptable ones as authenticated', async () => {
    const expiration = Math.floor(Date.now() / 1000) + 3600;
    const kv = createKv({
      'auth:jobkorea': {
        value: await encryptSession('JK=1'),
        expiration,
        metadata: { updatedAt: '2026-09-29T00:00:00.000Z' },
      },
      'auth:wanted': { value: 'legacy-plaintext-cookie', expiration },
      'jd:health:check': { value: '1' },
    });

    const response = await createHandler(createEnv(kv)).getStatus();
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(Object.keys(body.status).sort()).toEqual(['jobkorea', 'wanted']);
    expect(body.status.jobkorea).toMatchObject({
      authenticated: true,
      expiresAt: new Date(expiration * 1000).toISOString(),
      updatedAt: '2026-09-29T00:00:00.000Z',
    });
    expect(body.status.wanted.authenticated).toBe(false);
  });

  test('setAuth stores ciphertext with metadata in KV and nothing in D1', async () => {
    const kv = createKv();
    const response = await createHandler(createEnv(kv)).setAuth(
      jsonRequest({ platform: 'wanted', cookies: 'WANTED_SID=abc', email: 'me@example.com' })
    );

    expect(response.status).toBe(200);
    const stored = kv.store.get('auth:wanted');
    expect(stored.value).not.toContain('WANTED_SID=abc');
    expect(await decrypt(stored.value, { ENCRYPTION_KEY: TEST_ENCRYPTION_KEY })).toBe(
      'WANTED_SID=abc'
    );
    expect(stored.metadata).toMatchObject({ email: 'me@example.com' });
    expect(stored.metadata.updatedAt).toMatch(ISO);
    expect(stored.expiration).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('getCookies decrypts the KV session and returns null when missing or undecryptable', async () => {
    const kv = createKv({
      'auth:wanted': { value: await encryptSession('WANTED_SID=live') },
      'auth:jobkorea': { value: 'not-ciphertext' },
    });
    const handler = createHandler(createEnv(kv));

    expect(await handler.getCookies('wanted')).toBe('WANTED_SID=live');
    expect(await handler.getCookies('jobkorea')).toBeNull();
    expect(await handler.getCookies('linkedin')).toBeNull();
  });

  test('clearAuth deletes auth:<platform>', async () => {
    const kv = createKv({ 'auth:wanted': { value: await encryptSession('WANTED_SID=live') } });
    const request = Object.assign(new Request('https://resume.jclee.me/job/api/auth/wanted'), {
      params: { platform: 'wanted' },
      query: {},
    });

    const response = await createHandler(createEnv(kv)).clearAuth(request);

    expect(response.status).toBe(200);
    expect(kv.store.has('auth:wanted')).toBe(false);
  });
});

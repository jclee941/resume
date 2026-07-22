import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  mintWantedSession,
  refreshWantedSession,
  AUTH_WANTED_KEY,
  WANTED_TOKEN_URL,
  WANTED_SESSION_TTL_S,
} from '../mint-session.js';

const CREDS = {
  WANTED_EMAIL: 'someone@example.com',
  WANTED_PASSWORD: 'super-secret',
  WANTED_ONEID_CLIENT_ID: 'client-123',
};

function okResponse(token) {
  return {
    ok: true,
    async json() {
      return { token };
    },
  };
}

describe('mintWantedSession', () => {
  it('POSTs to the OneID token endpoint and returns the OneID cookie', async () => {
    let requestUrl = null;
    let requestOptions = null;
    const fetchImpl = mock.fn(async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return okResponse('abc123');
    });

    const cookie = await mintWantedSession(CREDS, { fetchImpl });

    assert.equal(requestUrl, WANTED_TOKEN_URL);
    assert.equal(requestOptions.method, 'POST');
    assert.equal(requestOptions.headers['oneid-agent'], 'web');

    const body = JSON.parse(requestOptions.body);
    assert.equal(body.grant_type, 'password');
    assert.equal(body.email, CREDS.WANTED_EMAIL);
    assert.equal(body.password, CREDS.WANTED_PASSWORD);
    assert.equal(body.client_id, CREDS.WANTED_ONEID_CLIENT_ID);

    assert.equal(cookie, 'WWW_ONEID_ACCESS_TOKEN=abc123');
  });

  it('throws when WANTED_ONEID_CLIENT_ID is missing', async () => {
    const fetchImpl = mock.fn(async () => okResponse('abc123'));
    await assert.rejects(
      () =>
        mintWantedSession(
          { WANTED_EMAIL: CREDS.WANTED_EMAIL, WANTED_PASSWORD: CREDS.WANTED_PASSWORD },
          { fetchImpl }
        ),
      /WANTED_ONEID_CLIENT_ID/
    );
    assert.equal(fetchImpl.mock.callCount(), 0);
  });

  it('throws when WANTED_EMAIL is missing', async () => {
    const fetchImpl = mock.fn(async () => okResponse('abc123'));
    await assert.rejects(
      () =>
        mintWantedSession(
          {
            WANTED_PASSWORD: CREDS.WANTED_PASSWORD,
            WANTED_ONEID_CLIENT_ID: CREDS.WANTED_ONEID_CLIENT_ID,
          },
          { fetchImpl }
        ),
      /WANTED_EMAIL/
    );
    assert.equal(fetchImpl.mock.callCount(), 0);
  });

  it('throws when WANTED_PASSWORD is missing', async () => {
    const fetchImpl = mock.fn(async () => okResponse('abc123'));
    await assert.rejects(
      () =>
        mintWantedSession(
          {
            WANTED_EMAIL: CREDS.WANTED_EMAIL,
            WANTED_ONEID_CLIENT_ID: CREDS.WANTED_ONEID_CLIENT_ID,
          },
          { fetchImpl }
        ),
      /WANTED_PASSWORD/
    );
    assert.equal(fetchImpl.mock.callCount(), 0);
  });

  it('throws when the OneID response is not ok', async () => {
    const fetchImpl = mock.fn(async () => ({
      ok: false,
      status: 401,
      async text() {
        return 'invalid credentials';
      },
    }));

    await assert.rejects(
      () => mintWantedSession(CREDS, { fetchImpl }),
      /OneID token request failed \(401\)/
    );
  });

  it('throws when the OneID response has no usable token', async () => {
    const fetchImpl = mock.fn(async () => okResponse(''));
    await assert.rejects(
      () => mintWantedSession(CREDS, { fetchImpl }),
      /did not include a usable token/
    );
  });
});

describe('refreshWantedSession', () => {
  it('mints a session and stores it in KV with the expected TTL', async () => {
    const fetchImpl = mock.fn(async () => okResponse('fresh-token'));
    const putCalls = [];
    const env = {
      ...CREDS,
      SESSIONS: {
        put: mock.fn(async (key, value, opts) => {
          putCalls.push({ key, value, opts });
        }),
      },
    };

    const result = await refreshWantedSession(env, { fetchImpl });

    assert.deepEqual(result, {
      ok: true,
      key: AUTH_WANTED_KEY,
      length: 'WWW_ONEID_ACCESS_TOKEN=fresh-token'.length,
    });
    assert.equal(env.SESSIONS.put.mock.callCount(), 1);
    assert.equal(putCalls[0].key, AUTH_WANTED_KEY);
    assert.equal(putCalls[0].value, 'WWW_ONEID_ACCESS_TOKEN=fresh-token');
    assert.deepEqual(putCalls[0].opts, { expirationTtl: WANTED_SESSION_TTL_S });
  });

  it('returns ok:false and never throws when creds are missing', async () => {
    const env = {
      SESSIONS: { put: mock.fn(async () => {}) },
    };

    const result = await refreshWantedSession(env);

    assert.equal(result.ok, false);
    assert.match(result.error, /WANTED_EMAIL/);
    assert.equal(env.SESSIONS.put.mock.callCount(), 0);
  });

  it('returns ok:false and never throws when the fetch fails', async () => {
    const fetchImpl = mock.fn(async () => {
      throw new Error('network down');
    });
    const env = {
      ...CREDS,
      SESSIONS: { put: mock.fn(async () => {}) },
    };

    const result = await refreshWantedSession(env, { fetchImpl });

    assert.deepEqual(result, { ok: false, error: 'network down' });
    assert.equal(env.SESSIONS.put.mock.callCount(), 0);
  });
});

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { decrypt } from '@resume/shared/crypto';

import {
  mintJobKoreaSession,
  refreshJobKoreaSession,
  AUTH_JOBKOREA_KEY,
  JOBKOREA_LOGIN_URL,
  JOBKOREA_SESSION_TTL_S,
} from '../mint-session.js';

const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');
const CREDS = { JOBKOREA_USERNAME: 'someone@example.com', JOBKOREA_PASSWORD: 'super-secret' };

const JOBKOREA_COOKIES = [
  { name: 'PLAY_SESSION', value: 'sess-abc', domain: '.jobkorea.co.kr' },
  { name: 'unrelated', value: 'x', domain: '.example.com' },
];

function createFakeCandidate() {
  return { evaluate: mock.fn(async () => true), click: mock.fn(async () => {}) };
}

function createFakeInput() {
  return { click: mock.fn(async () => {}), type: mock.fn(async () => {}) };
}

// `evaluateQueue` holds canned page.evaluate() return values in the exact
// order mint-session.js's internal helpers call page.evaluate(): isLoggedIn,
// then detectCaptcha on every login poll that is not yet logged in.
function createFakePage({ evaluateQueue = [true], cookies = JOBKOREA_COOKIES, inputs = {} } = {}) {
  const evaluateCalls = [];
  return {
    setRequestInterception: mock.fn(async () => {}),
    on: mock.fn(() => {}),
    goto: mock.fn(async () => {}),
    $: mock.fn(async (selector) => inputs[selector] ?? null),
    $$: mock.fn(async () => [createFakeCandidate()]),
    evaluate: mock.fn(async (fn, arg) => {
      evaluateCalls.push(arg);
      if (evaluateQueue.length === 0) {
        throw new Error('createFakePage: no queued evaluate() response left');
      }
      return evaluateQueue.shift();
    }),
    waitForNavigation: mock.fn(async () => {}),
    cookies: mock.fn(async () => cookies),
    close: mock.fn(async () => {}),
    url: () => JOBKOREA_LOGIN_URL,
    title: mock.fn(async () => 'JobKorea Login'),
    evaluateCalls,
  };
}

// The login form's hidden IP security field (#IP_ONOFF) as an element handle.
function createFakeIpSwitch() {
  return { evaluate: mock.fn(async () => {}) };
}

function defaultInputs() {
  return {
    'input[name="M_ID"]': createFakeInput(),
    'input[name="M_PWD"]': createFakeInput(),
    '#IP_ONOFF': createFakeIpSwitch(),
  };
}

function fakeWithBrowserSession(page) {
  return async (env, fn) =>
    fn({
      createBrowserContext: async () => ({ newPage: async () => page, close: async () => {} }),
    });
}

describe('mintJobKoreaSession', () => {
  it('logs in with no CAPTCHA and returns the serialized JobKorea cookie string', async () => {
    const inputs = defaultInputs();
    const page = createFakePage({ evaluateQueue: [true], inputs });

    const cookie = await mintJobKoreaSession(CREDS, {
      withBrowserSession: fakeWithBrowserSession(page),
    });

    assert.equal(cookie, 'PLAY_SESSION=sess-abc');
    assert.equal(page.goto.mock.calls[0].arguments[0], JOBKOREA_LOGIN_URL);
    assert.equal(
      inputs['input[name="M_ID"]'].type.mock.calls[0].arguments[0],
      CREDS.JOBKOREA_USERNAME
    );
    assert.equal(
      inputs['input[name="M_PWD"]'].type.mock.calls[0].arguments[0],
      CREDS.JOBKOREA_PASSWORD
    );
    assert.equal(page.close.mock.callCount(), 1);
  });

  it('throws when JOBKOREA_PASSWORD (and username) are missing', async () => {
    const withBrowserSession = mock.fn(async () => {
      throw new Error('should not be called');
    });
    await assert.rejects(
      () => mintJobKoreaSession({ JOBKOREA_USERNAME: 'a@b.com' }, { withBrowserSession }),
      /JOBKOREA_PASSWORD/
    );
    await assert.rejects(
      () => mintJobKoreaSession({}, { withBrowserSession }),
      /JOBKOREA_USERNAME/
    );
    assert.equal(withBrowserSession.mock.callCount(), 0);
  });

  it('fails with JOBKOREA_CAPTCHA_REQUIRED when JobKorea presents a CAPTCHA', async () => {
    const inputs = defaultInputs();
    const page = createFakePage({
      evaluateQueue: [
        false, // isLoggedIn (initial, right after submit)
        true, // detectCaptcha
      ],
      inputs,
    });

    await assert.rejects(
      () => mintJobKoreaSession(CREDS, { withBrowserSession: fakeWithBrowserSession(page) }),
      (error) => error.code === 'JOBKOREA_CAPTCHA_REQUIRED' && /CAPTCHA/.test(error.message)
    );
    assert.equal(page.close.mock.callCount(), 1);
  });

  it('throws a diagnostic error when login never completes', async () => {
    const inputs = defaultInputs();
    // Neither logged in nor a CAPTCHA is ever detected — every poll comes back false.
    const page = createFakePage({ evaluateQueue: Array(16).fill(false), inputs });

    await assert.rejects(
      () =>
        mintJobKoreaSession(CREDS, {
          withBrowserSession: fakeWithBrowserSession(page),
          pollIntervalMs: 0,
        }),
      /JobKorea login did not complete/
    );
    assert.equal(page.close.mock.callCount(), 1);
  });
});

describe('refreshJobKoreaSession', () => {
  it('mints a session and stores it in KV with the expected TTL', async () => {
    const inputs = defaultInputs();
    const page = createFakePage({ evaluateQueue: [true], inputs });
    const putCalls = [];
    const env = {
      ...CREDS,
      ENCRYPTION_KEY,
      SESSIONS: {
        put: mock.fn(async (key, value, opts) => {
          putCalls.push({ key, value, opts });
        }),
      },
    };

    const result = await refreshJobKoreaSession(env, {
      withBrowserSession: fakeWithBrowserSession(page),
    });

    assert.deepEqual(result, {
      ok: true,
      key: AUTH_JOBKOREA_KEY,
      length: 'PLAY_SESSION=sess-abc'.length,
    });
    assert.equal(putCalls.length, 1);
    assert.equal(putCalls[0].key, AUTH_JOBKOREA_KEY);
    assert.doesNotMatch(putCalls[0].value, /PLAY_SESSION/);
    assert.equal(await decrypt(putCalls[0].value, { ENCRYPTION_KEY }), 'PLAY_SESSION=sess-abc');
    assert.equal(putCalls[0].opts.expirationTtl, JOBKOREA_SESSION_TTL_S);
    assert.match(putCalls[0].opts.metadata.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns ok:false and never throws when creds are missing', async () => {
    const env = { SESSIONS: { put: mock.fn(async () => {}) } };
    const result = await refreshJobKoreaSession(env);
    assert.equal(result.ok, false);
    assert.match(result.error, /JOBKOREA_USERNAME/);
    assert.equal(env.SESSIONS.put.mock.callCount(), 0);
  });

  it('returns ok:false and never throws when the browser session fails', async () => {
    const env = { ...CREDS, SESSIONS: { put: mock.fn(async () => {}) } };
    const withBrowserSession = mock.fn(async () => {
      throw new Error('Failed to acquire browser session');
    });

    const result = await refreshJobKoreaSession(env, { withBrowserSession });

    assert.deepEqual(result, { ok: false, error: 'Failed to acquire browser session' });
    assert.equal(env.SESSIONS.put.mock.callCount(), 0);
  });
});

describe('mintJobKoreaSession IP security', () => {
  it('switches IP security off before submitting, so another browser can replay the session', async () => {
    const order = [];
    const ipSwitch = {
      evaluate: mock.fn(async () => {
        order.push('ip-security-off');
      }),
    };
    const page = createFakePage({
      evaluateQueue: [true],
      inputs: { ...defaultInputs(), '#IP_ONOFF': ipSwitch },
    });
    page.$$ = mock.fn(async () => [
      {
        evaluate: async () => true,
        click: async () => {
          order.push('submit');
        },
      },
    ]);

    await mintJobKoreaSession(CREDS, { withBrowserSession: fakeWithBrowserSession(page) });

    assert.deepEqual(order, ['ip-security-off', 'submit']);
    // Run the in-page step against stand-ins for the field and the document.
    const field = { value: 'Y' };
    const fakeDocument = { cookie: '' };
    globalThis.document = fakeDocument;
    try {
      ipSwitch.evaluate.mock.calls[0].arguments[0](field);
    } finally {
      delete globalThis.document;
    }
    assert.equal(field.value, 'N');
    assert.match(fakeDocument.cookie, /^Secure_IPonOFF=N;/);
    assert.match(fakeDocument.cookie, /domain=jobkorea\.co\.kr/);
  });

  it('still logs in, with a warning, when the login form has no IP security switch', async () => {
    const warn = mock.method(console, 'warn', () => {});
    const inputs = defaultInputs();
    delete inputs['#IP_ONOFF'];
    const page = createFakePage({ evaluateQueue: [true], inputs });
    try {
      const cookie = await mintJobKoreaSession(CREDS, {
        withBrowserSession: fakeWithBrowserSession(page),
      });

      assert.equal(cookie, 'PLAY_SESSION=sess-abc');
      assert.equal(warn.mock.callCount(), 1);
      assert.match(String(warn.mock.calls[0].arguments[0]), /IP security/);
    } finally {
      warn.mock.restore();
    }
  });
});

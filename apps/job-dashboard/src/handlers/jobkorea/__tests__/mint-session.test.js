import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  mintJobKoreaSession,
  refreshJobKoreaSession,
  solveJobKoreaCaptcha,
  AUTH_JOBKOREA_KEY,
  JOBKOREA_LOGIN_URL,
  JOBKOREA_SESSION_TTL_S,
} from '../mint-session.js';

const CREDS = { JOBKOREA_USERNAME: 'someone@example.com', JOBKOREA_PASSWORD: 'super-secret' };
const CLIPROXY_ENV = {
  CLIPROXY_BASE: 'https://cliproxy.jclee.me',
  CLIPROXY_API_KEY: 'cliproxy-key',
};

const JOBKOREA_COOKIES = [
  { name: 'PLAY_SESSION', value: 'sess-abc', domain: '.jobkorea.co.kr' },
  { name: 'unrelated', value: 'x', domain: '.example.com' },
];

function okVisionResponse(content) {
  return {
    ok: true,
    async json() {
      return { choices: [{ message: { content } }] };
    },
  };
}

function createFakeCandidate() {
  return { evaluate: mock.fn(async () => true), click: mock.fn(async () => {}) };
}

function createFakeInput() {
  return { click: mock.fn(async () => {}), type: mock.fn(async () => {}) };
}

// `evaluateQueue` holds canned page.evaluate() return values in the exact
// order mint-session.js's internal helpers call page.evaluate(): isLoggedIn,
// detectCaptcha, findCaptchaImageUrl, downloadCaptchaImage, fillCaptchaInput.
function createFakePage({ evaluateQueue = [true], cookies = JOBKOREA_COOKIES, inputs = {} } = {}) {
  const evaluateCalls = [];
  return {
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

function defaultInputs() {
  return {
    'input[name="M_ID"]': createFakeInput(),
    'input[name="M_PWD"]': createFakeInput(),
  };
}

function fakeWithBrowserSession(page) {
  return async (env, fn) => fn({ newPage: async () => page });
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

  it('solves a CAPTCHA challenge via cliproxy vision and logs in on the retry', async () => {
    const inputs = defaultInputs();
    const page = createFakePage({
      evaluateQueue: [
        false, // isLoggedIn (initial, right after submit)
        true, // detectCaptcha
        'https://www.jobkorea.co.kr/login/captcha.asp', // findCaptchaImageUrl
        { base64: 'ZmFrZQ==', mime: 'image/png' }, // downloadCaptchaImage
        true, // fillCaptchaInput (element found)
        true, // isLoggedIn (after CAPTCHA submit)
      ],
      inputs,
    });

    let requestUrl = null;
    let requestOptions = null;
    const fetchImpl = mock.fn(async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return okVisionResponse('ABC123');
    });

    const cookie = await mintJobKoreaSession(
      { ...CREDS, ...CLIPROXY_ENV },
      { withBrowserSession: fakeWithBrowserSession(page), fetchImpl }
    );

    assert.equal(cookie, 'PLAY_SESSION=sess-abc');
    assert.equal(requestUrl, `${CLIPROXY_ENV.CLIPROXY_BASE}/chat/completions`);
    assert.equal(requestOptions.headers.Authorization, `Bearer ${CLIPROXY_ENV.CLIPROXY_API_KEY}`);
    const body = JSON.parse(requestOptions.body);
    assert.equal(body.messages[0].content[1].image_url.url, 'data:image/png;base64,ZmFrZQ==');

    // fillCaptchaInput's page.evaluate call carries the #gtxt selector + solved answer.
    const fillCall = page.evaluateCalls.find((arg) => arg && arg.value === 'ABC123');
    assert.ok(fillCall, 'expected a page.evaluate() call filling #gtxt with the solved answer');
  });

  it('throws a diagnostic error when login never completes', async () => {
    const inputs = defaultInputs();
    // Neither logged in nor a CAPTCHA is ever detected — every poll comes back false.
    const page = createFakePage({ evaluateQueue: Array(16).fill(false), inputs });

    await assert.rejects(
      () => mintJobKoreaSession(CREDS, { withBrowserSession: fakeWithBrowserSession(page) }),
      /JobKorea login did not complete/
    );
    assert.equal(page.close.mock.callCount(), 1);
  });
});

describe('solveJobKoreaCaptcha', () => {
  it('POSTs the image to cliproxy and returns the trimmed answer', async () => {
    const fetchImpl = mock.fn(async () => okVisionResponse('  XY7Z9K  '));
    const answer = await solveJobKoreaCaptcha(
      CLIPROXY_ENV,
      { mime: 'image/png', base64: 'ZmFrZQ==' },
      { fetchImpl }
    );
    assert.equal(answer, 'XY7Z9K');
    assert.equal(
      fetchImpl.mock.calls[0].arguments[0],
      `${CLIPROXY_ENV.CLIPROXY_BASE}/chat/completions`
    );
  });

  it('throws when the cliproxy response is not ok', async () => {
    const fetchImpl = mock.fn(async () => ({
      ok: false,
      status: 500,
      async text() {
        return 'upstream error';
      },
    }));
    await assert.rejects(
      () =>
        solveJobKoreaCaptcha(
          CLIPROXY_ENV,
          { mime: 'image/png', base64: 'ZmFrZQ==' },
          { fetchImpl }
        ),
      /cliproxy CAPTCHA solve failed \(500\)/
    );
  });

  it('throws when CLIPROXY_BASE/CLIPROXY_API_KEY are not configured', async () => {
    const fetchImpl = mock.fn(async () => okVisionResponse('ABC123'));
    await assert.rejects(
      () => solveJobKoreaCaptcha({}, { mime: 'image/png', base64: 'ZmFrZQ==' }, { fetchImpl }),
      /CLIPROXY_BASE/
    );
    assert.equal(fetchImpl.mock.callCount(), 0);
  });
});

describe('refreshJobKoreaSession', () => {
  it('mints a session and stores it in KV with the expected TTL', async () => {
    const inputs = defaultInputs();
    const page = createFakePage({ evaluateQueue: [true], inputs });
    const putCalls = [];
    const env = {
      ...CREDS,
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
    assert.equal(putCalls[0].value, 'PLAY_SESSION=sess-abc');
    assert.deepEqual(putCalls[0].opts, { expirationTtl: JOBKOREA_SESSION_TTL_S });
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

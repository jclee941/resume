import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  resolveCliproxyBase,
  resolveCliproxyApiKey,
  isCliproxyConfigured,
  findCaptchaImageUrl,
  normalizeCaptchaAnswer,
  solveJobKoreaCaptcha,
} from '../jobkorea-handler/captcha-solver.js';

describe('captcha-solver.resolveCliproxyBase', () => {
  it('returns trimmed base URL when valid', () => {
    const env = { CLIPROXY_BASE: 'https://cliproxy.example.com/' };
    assert.strictEqual(resolveCliproxyBase(env), 'https://cliproxy.example.com');
  });

  it('throws when CLIPROXY_BASE is missing', () => {
    assert.throws(() => resolveCliproxyBase({}), /CLIPROXY_BASE is required/);
  });

  it('throws when CLIPROXY_BASE is not a valid URL scheme', () => {
    assert.throws(
      () => resolveCliproxyBase({ CLIPROXY_BASE: 'ftp://example.com' }),
      /must use https unless it targets localhost/
    );
  });

  it('throws when CLIPROXY_BASE is malformed', () => {
    assert.throws(
      () => resolveCliproxyBase({ CLIPROXY_BASE: 'http://bad url with spaces' }),
      /must be a valid URL/
    );
  });

  it('throws when CLIPROXY_BASE uses plaintext HTTP for a remote host', () => {
    assert.throws(
      () => resolveCliproxyBase({ CLIPROXY_BASE: 'http://cliproxy.example.com' }),
      /must use https unless it targets localhost/
    );
  });

  it('allows plaintext HTTP only for localhost debug proxies', () => {
    assert.strictEqual(
      resolveCliproxyBase({ CLIPROXY_BASE: 'http://localhost:8787/' }),
      'http://localhost:8787'
    );
  });
});

describe('captcha-solver.resolveCliproxyApiKey', () => {
  it('returns trimmed API key when present', () => {
    const env = { CLIPROXY_API_KEY: '  secret123  ' };
    assert.strictEqual(resolveCliproxyApiKey(env), 'secret123');
  });

  it('throws when CLIPROXY_API_KEY is missing', () => {
    assert.throws(() => resolveCliproxyApiKey({}), /CLIPROXY_API_KEY is required/);
  });
});

describe('captcha-solver.isCliproxyConfigured', () => {
  it('returns true when both base and key are set', () => {
    assert.strictEqual(
      isCliproxyConfigured({ CLIPROXY_BASE: 'https://x.com', CLIPROXY_API_KEY: 'k' }),
      true
    );
  });

  it('returns false when base is missing', () => {
    assert.strictEqual(isCliproxyConfigured({ CLIPROXY_API_KEY: 'k' }), false);
  });

  it('returns false when key is missing', () => {
    assert.strictEqual(isCliproxyConfigured({ CLIPROXY_BASE: 'https://x.com' }), false);
  });

  it('returns false when both are missing', () => {
    assert.strictEqual(isCliproxyConfigured({}), false);
  });

  it('returns false when values are whitespace-only', () => {
    assert.strictEqual(
      isCliproxyConfigured({ CLIPROXY_BASE: '  ', CLIPROXY_API_KEY: '  ' }),
      false
    );
  });
});

describe('captcha-solver.findCaptchaImageUrl', () => {
  it('returns direct img src when captcha image exists', async () => {
    const page = {
      evaluate: mock.fn(async () => 'https://www.jobkorea.co.kr/captcha/123.bmp'),
    };
    const result = await findCaptchaImageUrl(page);
    assert.strictEqual(result, 'https://www.jobkorea.co.kr/captcha/123.bmp');
  });

  it('returns null when no captcha is found', async () => {
    const page = {
      evaluate: mock.fn(async () => null),
    };
    const result = await findCaptchaImageUrl(page);
    assert.strictEqual(result, null);
  });
});

describe('captcha-solver.normalizeCaptchaAnswer', () => {
  it('rejects descriptive words returned by vision models', () => {
    assert.strictEqual(normalizeCaptchaAnswer('images'), '');
    assert.strictEqual(normalizeCaptchaAnswer('CAPTCHAs'), '');
    assert.strictEqual(normalizeCaptchaAnswer('solve'), '');
    assert.strictEqual(normalizeCaptchaAnswer('help'), '');
    assert.strictEqual(normalizeCaptchaAnswer('style'), '');
    assert.strictEqual(normalizeCaptchaAnswer('Sorry'), '');
  });

  it('extracts the last plausible alphanumeric answer', () => {
    assert.strictEqual(normalizeCaptchaAnswer('The answer is A7kP2'), 'A7kP2');
  });
});

describe('captcha-solver.solveJobKoreaCaptcha', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    Object.keys(process.env).forEach((k) => delete process.env[k]);
    Object.entries(originalEnv).forEach(([k, v]) => {
      if (v !== undefined) process.env[k] = v;
    });
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete globalThis.fetch;
    }
  });

  it('returns null when no CAPTCHA image is found', async () => {
    const page = {
      evaluate: mock.fn(async () => null),
    };
    const result = await solveJobKoreaCaptcha(page);
    assert.strictEqual(result, null);
  });

  it('returns null and skips vision API when cliproxy is unconfigured', async () => {
    const page = {
      evaluate: mock.fn(async () => 'https://www.jobkorea.co.kr/login/captcha.asp'),
    };
    const result = await solveJobKoreaCaptcha(page);
    assert.strictEqual(result, null);
  });

  it('returns null when all vision models fail', async () => {
    process.env.CLIPROXY_BASE = 'https://cliproxy.example.com';
    process.env.CLIPROXY_API_KEY = 'test-key';

    const page = {
      evaluate: mock.fn(async () => {
        return {
          base64: 'fakebase64',
          mime: 'image/png',
        };
      }),
    };

    globalThis.fetch = mock.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    }));

    const result = await solveJobKoreaCaptcha(page);
    assert.strictEqual(result, null);
  });

  it('skips descriptive model answers and returns the next plausible result', async () => {
    process.env.CLIPROXY_BASE = 'https://cliproxy.example.com';
    process.env.CLIPROXY_API_KEY = 'test-key';
    process.env.JOBKOREA_CAPTCHA_MODELS = 'model-a,model-b';

    let evaluateCalls = 0;
    const page = {
      evaluate: mock.fn(async () => {
        evaluateCalls += 1;
        return evaluateCalls === 1
          ? 'https://www.jobkorea.co.kr/login/captcha.asp'
          : { base64: 'fakebase64', mime: 'image/png' };
      }),
    };
    const modelAnswers = ['images', 'A7kP2'];
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: modelAnswers.shift() } }],
      }),
    }));

    const result = await solveJobKoreaCaptcha(page);

    assert.deepStrictEqual(result, { text: 'A7kP2', model: 'model-b' });
    assert.strictEqual(globalThis.fetch.mock.callCount(), 2);
  });

  it('prefers a stronger mixed captcha answer over lowercase-only text', async () => {
    process.env.CLIPROXY_BASE = 'https://cliproxy.example.com';
    process.env.CLIPROXY_API_KEY = 'test-key';
    process.env.JOBKOREA_CAPTCHA_MODELS = 'model-a,model-b';

    let evaluateCalls = 0;
    const page = {
      evaluate: mock.fn(async () => {
        evaluateCalls += 1;
        return evaluateCalls === 1
          ? 'https://www.jobkorea.co.kr/login/captcha.asp'
          : { base64: 'fakebase64', mime: 'image/png' };
      }),
    };
    const modelAnswers = ['abcdx', 'A7kP2'];
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: modelAnswers.shift() } }],
      }),
    }));

    const result = await solveJobKoreaCaptcha(page);

    assert.deepStrictEqual(result, { text: 'A7kP2', model: 'model-b' });
    assert.strictEqual(globalThis.fetch.mock.callCount(), 2);
  });
});

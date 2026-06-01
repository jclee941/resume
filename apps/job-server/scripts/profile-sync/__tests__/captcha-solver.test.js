import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  resolveCliproxyBase,
  resolveCliproxyApiKey,
  isCliproxyConfigured,
  findCaptchaImageUrl,
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
      /must start with http:\/\/ or https:\/\//
    );
  });

  it('throws when CLIPROXY_BASE is malformed', () => {
    assert.throws(
      () => resolveCliproxyBase({ CLIPROXY_BASE: 'http://bad url with spaces' }),
      /must be a valid URL/
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

describe('captcha-solver.solveJobKoreaCaptcha', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    Object.keys(process.env).forEach((k) => delete process.env[k]);
    Object.entries(originalEnv).forEach(([k, v]) => {
      if (v !== undefined) process.env[k] = v;
    });
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

    delete globalThis.fetch;
  });
});

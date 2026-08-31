import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sessionContentValidationMethods } from '../session-manager/session-content-validation.js';

const validate = (platform, session) =>
  sessionContentValidationMethods.validateSessionContent(platform, session);

const createJwt = (payload) =>
  ['header', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'signature'].join('.');

const invalidSessions = [
  ['timestamp only', { timestamp: Date.now() }],
  ['empty cookie array', { cookies: [] }],
  ['empty cookie string', { cookieString: '' }],
  ['unrelated cookie array', { cookies: [{ name: 'theme', value: 'dark' }] }],
  ['unrelated cookie string', { cookieString: 'theme=dark' }],
];

describe('session content validation', () => {
  for (const platform of ['wanted', 'jobkorea', 'saramin']) {
    describe(platform, () => {
      for (const [shape, session] of invalidSessions) {
        it(`rejects ${shape}`, () => {
          assert.equal(validate(platform, session).valid, false);
        });
      }
    });
  }

  it('accepts established Wanted token and ONEID cookie shapes', () => {
    const sessions = [
      { token: 'wanted-token' },
      { cookieString: 'WWW_ONEID_ACCESS_TOKEN=wanted-cookie' },
      { cookies: [{ name: 'ONEID_SESSION', value: 'wanted-cookie' }] },
    ];

    for (const session of sessions) {
      assert.equal(validate('wanted', session).valid, true);
    }
  });

  it('rejects Wanted ONEID cookies with empty values', () => {
    assert.equal(validate('wanted', { cookieString: 'WWW_ONEID_ACCESS_TOKEN=' }).valid, false);
    assert.equal(
      validate('wanted', { cookies: [{ name: 'ONEID_SESSION', value: '' }] }).valid,
      false
    );
  });

  it('rejects deceptive Wanted cookie names and refresh-token-only sessions', () => {
    const sessions = [
      { cookieString: 'NOT_ONEID=deceptive' },
      { cookies: [{ name: 'custom_ONEID_cookie', value: 'deceptive' }] },
      { cookieString: 'WWW_ONEID_REFRESH_TOKEN=refresh-token' },
    ];

    for (const session of sessions) {
      assert.equal(validate('wanted', session).valid, false);
    }
  });

  it('accepts established JobKorea token and auth cookie shapes', () => {
    const sessions = [
      { token: 'jobkorea-token' },
      { cookieString: 'User=UID=member-1&Type=M' },
      { cookies: [{ name: 'C_USER', value: 'UID=member-2&DB_NAME=GG' }] },
      { cookieString: 'JK_User=M%5FID=member-3&Type=M' },
      { cookies: [{ name: 'NET_SessionId', value: 'jobkorea-session' }] },
      { cookieString: `jkat=${createJwt({ exp: Math.floor(Date.now() / 1000) + 120 })}` },
    ];

    for (const session of sessions) {
      assert.equal(validate('jobkorea', session).valid, true);
    }
  });

  it('preserves JobKorea empty UID reasons', () => {
    assert.equal(
      validate('jobkorea', { cookieString: 'User=UID=&Type=M' }).reason,
      'empty_jobkorea_uid'
    );
    assert.equal(
      validate('jobkorea', { cookies: [{ name: 'C_USER', value: 'UID=' }] }).reason,
      'empty_jobkorea_cuser_uid'
    );
  });

  it('rejects JobKorea auth cookies with empty values', () => {
    assert.equal(validate('jobkorea', { cookieString: 'NET_SessionId=' }).valid, false);
  });

  it('rejects missing, undefined, non-string, and empty NET_SessionId values', () => {
    const cookies = [
      { name: 'NET_SessionId' },
      { name: 'NET_SessionId', value: undefined },
      { name: 'NET_SessionId', value: 123 },
      { name: 'NET_SessionId', value: '' },
    ];

    for (const cookie of cookies) {
      assert.equal(validate('jobkorea', { cookies: [cookie] }).valid, false);
    }
  });

  it('rejects malformed, expired, near-expiry, and empty jkat cookies', () => {
    const now = Math.floor(Date.now() / 1000);
    const sessions = [
      { cookieString: 'jkat=' },
      { cookieString: 'jkat=not-a-jwt' },
      { cookies: [{ name: 'jkat', value: 'header.payload' }] },
      { cookies: [{ name: 'jkat', value: 'header.not-json.signature' }] },
      { cookieString: `jkat=${createJwt({ sub: 'member' })}` },
      { cookieString: `jkat=${createJwt({ exp: String(now + 120) })}` },
      { cookieString: `jkat=${createJwt({ exp: now - 1 })}` },
      { cookieString: `jkat=${createJwt({ exp: now + 30 })}` },
    ];

    for (const session of sessions) {
      assert.equal(validate('jobkorea', session).valid, false);
    }
  });

  it('rejects jkat segments containing non-base64url characters', () => {
    const payload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 })
    ).toString('base64url');
    const tokens = [
      `head er.${payload}.signature`,
      `header.${payload}!.signature`,
      `header.${payload}.sign%ature`,
      `header.${payload}.signature!`,
    ];

    for (const token of tokens) {
      assert.equal(validate('jobkorea', { cookies: [{ name: 'jkat', value: token }] }).valid, false);
    }
  });

  for (const [platform, authCookieName] of [
    ['wanted', 'ONEID'],
    ['jobkorea', 'NET_SessionId'],
    ['saramin', 'PHPSESSID'],
  ]) {
    it(`rejects malformed ${platform} cookie arrays without throwing`, () => {
      const malformedCookies = [null, { value: 'auth' }, { name: authCookieName, value: 123 }];

      for (const cookie of malformedCookies) {
        let result;
        assert.doesNotThrow(() => {
          result = validate(platform, { cookies: [cookie] });
        });
        assert.equal(result.valid, false);
      }
    });
  }

  it('accepts established Saramin token and auth cookie shapes', () => {
    const sessions = [
      { token: 'saramin-token' },
      { cookieString: 'PHPSESSID=saramin-session' },
      { cookies: [{ name: '_saramin_session', value: 'saramin-cookie' }] },
    ];

    for (const session of sessions) {
      assert.equal(validate('saramin', session).valid, true);
    }
  });

  it('rejects Saramin auth cookies with empty values', () => {
    assert.equal(validate('saramin', { cookieString: 'PHPSESSID=' }).valid, false);
  });
});

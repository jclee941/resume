import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import JobKoreaHandler from '../jobkorea-handler.js';
import { syncJobKoreaProfile } from '../jobkorea-handler/sync.js';
import { resolveCliproxyBase } from '../jobkorea-handler/captcha-solver.js';
import SessionManager from '../../../src/shared/services/session/session-manager.js';
import {
  assertJobKoreaResumeAccess,
  JOBKOREA_SESSION_RENEW_PATH,
} from '../jobkorea-handler/session.js';
// Ensure JOBKOREA_RNO is set for tests that validate profile URLs
process.env.JOBKOREA_RNO = process.env.JOBKOREA_RNO || '30236578';

describe('JobKoreaHandler.computeChanges', () => {
  const handler = new JobKoreaHandler();

  it('detects changed key field values', () => {
    const before = [{ name: 'Career[c1].C_Name', value: 'Old Company' }];
    const after = [{ name: 'Career[c1].C_Name', value: 'New Company' }];

    const changes = handler.computeChanges(before, after);

    assert.strictEqual(changes.length, 1);
    assert.deepStrictEqual(changes[0], {
      field: 'Career c1 company',
      from: 'Old Company',
      to: 'New Company',
    });
  });

  it('ignores identical key field values', () => {
    const before = [{ name: 'License[c1].Lc_YYMM', value: '202008' }];
    const after = [{ name: 'License[c1].Lc_YYMM', value: '202008' }];

    const changes = handler.computeChanges(before, after);

    assert.deepStrictEqual(changes, []);
  });

  it('handles empty input arrays', () => {
    assert.deepStrictEqual(handler.computeChanges([], []), []);
    assert.deepStrictEqual(handler.computeChanges(undefined, undefined), []);
  });

  it('ignores non-key fields and reports correct shape for key fields', () => {
    const before = [
      { name: 'Career[c1].Co_Code_Extra', value: 'A' },
      { name: 'HopeJob.HJ_Name', value: '시스템엔지니어' },
    ];
    const after = [
      { name: 'Career[c1].Co_Code_Extra', value: 'B' },
      { name: 'HopeJob.HJ_Name', value: '시스템엔지니어,보안엔지니어' },
    ];

    const changes = handler.computeChanges(before, after);

    assert.strictEqual(changes.length, 1);
    assert.deepStrictEqual(Object.keys(changes[0]).sort(), ['field', 'from', 'to']);
    assert.strictEqual(changes[0].field, 'Hope job names');
    assert.strictEqual(changes[0].from, '시스템엔지니어');
    assert.strictEqual(changes[0].to, '시스템엔지니어,보안엔지니어');
  });
});

describe('JobKoreaHandler.describeField', () => {
  const handler = new JobKoreaHandler();

  it('maps Career field names to readable labels', () => {
    assert.strictEqual(handler.describeField('Career[c14].C_Name'), 'Career c14 company');
    assert.strictEqual(handler.describeField('Career[c14].M_MainField'), 'Career c14 job code');
    assert.strictEqual(handler.describeField('Career[c14].C_Client'), 'Career c14 client');
    assert.strictEqual(
      handler.describeField('Career[c14].Project[p1].P_Name'),
      'Career c14 project p1 name'
    );
  });

  it('maps School field names to readable labels', () => {
    assert.strictEqual(handler.describeField('UnivSchool[c10].Schl_Name'), 'School c10 school');
    assert.strictEqual(
      handler.describeField('UnivSchool[c10].UnivMajor[0].Major_Name'),
      'School c10 major'
    );
  });

  it('maps License field names to readable labels', () => {
    assert.strictEqual(handler.describeField('License[c9].Lc_Name'), 'License c9 name');
    assert.strictEqual(handler.describeField('License[c9].Lc_YYMM'), 'License c9 date');
    assert.strictEqual(handler.describeField('License[c9].Lc_CredUrl'), 'License c9 credential URL');
  });

  it('maps verified gap field names to readable labels', () => {
    assert.strictEqual(handler.describeField('Skill[c1].Skill_Name'), 'Skill c1 name');
    assert.strictEqual(handler.describeField('Language[c1].Lang_Level'), 'Language c1 level');
    assert.strictEqual(handler.describeField('HighSchool[c1].Schl_Name'), 'High school c1 school');
    assert.strictEqual(handler.describeField('Project[c1].P_Url'), 'Project c1 URL');
    assert.strictEqual(handler.describeField('HopeJob.HJ_Salary'), 'Hope salary');
    assert.strictEqual(handler.describeField('HopeJob.HJ_Industry'), 'Hope industry');
    assert.strictEqual(handler.describeField('UserResume.Birth_YMD'), 'Personal birth date');
  });

  it('maps Award field names to readable labels', () => {
    assert.strictEqual(handler.describeField('Award[c2].Award_Name'), 'Award c2 name');
    assert.strictEqual(handler.describeField('Award[c2].Award_Inst_Name'), 'Award c2 organization');
    assert.strictEqual(handler.describeField('Award[c2].Award_Year'), 'Award c2 year');
  });

  it('maps military named fields', () => {
    assert.strictEqual(handler.describeField('UserAddition.Military_Stat'), 'Military status');
    assert.strictEqual(handler.describeField('UserAddition.Military_Kind'), 'Military kind');
    assert.strictEqual(handler.describeField('UserAddition.Military_SYM'), 'Military start');
    assert.strictEqual(handler.describeField('UserAddition.Military_EYM'), 'Military end');
  });

  it('returns unknown fields unchanged', () => {
    assert.strictEqual(
      handler.describeField('InputStat.CareerInputStat'),
      'InputStat.CareerInputStat'
    );
  });
});

describe('JobKoreaHandler.saveSession', () => {
  let handler;
  let savedData;

  beforeEach(() => {
    handler = new JobKoreaHandler();
    savedData = null;
    mock.method(SessionManager, 'load', () => null);
    mock.method(SessionManager, 'save', (_platform, data) => {
      savedData = data;
      return true;
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('preserves existing session metadata when updating cookies', () => {
    const existingSession = {
      platform: 'jobkorea',
      expiresAt: '2026-04-01T00:00:00.000Z',
      cookieCount: 5,
      extractedAt: '2026-03-15T00:00:00.000Z',
      cookies: [{ name: 'old', value: 'cookie' }],
      cookieString: 'old=cookie',
    };
    SessionManager.load.mock.mockImplementation(() => existingSession);

    const newCookies = [
      { name: 'ACNT_COOKIE', value: 'abc123' },
      { name: 'SES_ID', value: 'xyz789' },
    ];
    handler.saveSession(newCookies);

    assert.strictEqual(savedData.platform, 'jobkorea');
    assert.strictEqual(savedData.expiresAt, '2026-04-01T00:00:00.000Z');
    assert.strictEqual(savedData.cookies.length, 2);
    assert.strictEqual(savedData.cookies[0].name, 'ACNT_COOKIE');
    assert.strictEqual(savedData.cookieString, 'ACNT_COOKIE=abc123; SES_ID=xyz789');
    assert.strictEqual(savedData.cookieCount, 2);
    assert.notStrictEqual(savedData.extractedAt, '2026-03-15T00:00:00.000Z');
  });

  it('populates defaults when no existing session file', () => {
    const cookies = [{ name: 'test', value: 'val' }];
    handler.saveSession(cookies);

    assert.strictEqual(savedData.platform, 'jobkorea');
    assert.ok(savedData.expiresAt);
    assert.strictEqual(savedData.cookies.length, 1);
    assert.strictEqual(savedData.cookieString, 'test=val');
    assert.strictEqual(savedData.cookieCount, 1);
    assert.ok(savedData.extractedAt);
  });

  it('builds correct cookieString from cookie array', () => {
    const cookies = [
      { name: 'A', value: '1' },
      { name: 'B', value: '2' },
      { name: 'C', value: '3' },
    ];
    handler.saveSession(cookies);

    assert.strictEqual(savedData.cookieString, 'A=1; B=2; C=3');
    assert.strictEqual(savedData.cookieCount, 3);
  });

  it('normalizes legacy array session to object with metadata', () => {
    const legacyArray = [{ name: 'ACNT_COOKIE', value: 'legacy123', domain: '.jobkorea.co.kr' }];
    SessionManager.load.mock.mockImplementation(() => legacyArray);

    const newCookies = [
      { name: 'ACNT_COOKIE', value: 'updated456' },
      { name: 'SES_ID', value: 'new789' },
    ];
    handler.saveSession(newCookies);

    assert.ok(!Array.isArray(savedData), 'saved session must be an object, not array');
    assert.strictEqual(savedData.platform, 'jobkorea');
    assert.ok(savedData.expiresAt, 'must have expiresAt default');
    assert.strictEqual(savedData.cookies.length, 2);
    assert.strictEqual(savedData.cookieString, 'ACNT_COOKIE=updated456; SES_ID=new789');
    assert.strictEqual(savedData.cookieCount, 2);
    assert.ok(savedData.extractedAt);
  });
});

describe('JobKoreaHandler.loadSession - auth-sync compatibility', () => {
  let handler;

  beforeEach(() => {
    handler = new JobKoreaHandler({}, {});
    mock.restoreAll();
    mock.method(SessionManager, 'save', () => true);
  });

  it('loads cookie array from auth-sync-style session (cookies as objects)', () => {
    const authSyncSession = {
      platform: 'jobkorea',
      cookies: [
        { name: 'ACNT_COOKIE', value: 'abc', domain: '.jobkorea.co.kr', path: '/' },
        { name: 'SES_ID', value: 'xyz', domain: '.jobkorea.co.kr', path: '/' },
      ],
      cookieString: 'ACNT_COOKIE=abc; SES_ID=xyz',
      cookieCount: 2,
      extractedAt: '2026-03-18T00:00:00.000Z',
      expiresAt: '2999-03-19T00:00:00.000Z',
    };

    mock.method(SessionManager, 'load', () => authSyncSession);

    const result = handler.loadSession();
    assert.ok(Array.isArray(result), 'must return array');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'ACNT_COOKIE');
    assert.strictEqual(result[1].domain, '.jobkorea.co.kr');
  });
});

describe('resolveCliproxyBase', () => {
  it('throws when CLIPROXY_BASE is missing', () => {
    assert.throws(
      () => resolveCliproxyBase({}),
      /CLIPROXY_BASE is required for JobKorea CAPTCHA solving/
    );
  });

  it('throws when CLIPROXY_BASE is empty', () => {
    assert.throws(
      () => resolveCliproxyBase({ CLIPROXY_BASE: '   ' }),
      /CLIPROXY_BASE is required for JobKorea CAPTCHA solving/
    );
  });

  it('throws when CLIPROXY_BASE does not use HTTP or HTTPS', () => {
    assert.throws(
      () => resolveCliproxyBase({ CLIPROXY_BASE: 'ftp://vision.example.test/v1' }),
      /CLIPROXY_BASE must start with http:\/\/ or https:\/\//
    );
  });

  it('throws when CLIPROXY_BASE is not a valid URL', () => {
    assert.throws(
      () => resolveCliproxyBase({ CLIPROXY_BASE: 'https://exa mple.test/v1' }),
      /CLIPROXY_BASE must be a valid URL/
    );
  });

  it('returns a valid normalized CLIPROXY_BASE', () => {
    assert.strictEqual(
      resolveCliproxyBase({ CLIPROXY_BASE: ' https://vision.example.test/v1/// ' }),
      'https://vision.example.test/v1'
    );
  });
});

describe('JobKorea fail-loud guards', () => {
  function createSyncHarness(overrides = {}) {
    const logs = [];
    const page = {
      goto: async () => {},
      url: () => overrides.url ?? 'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=30236578',
      content: async () => overrides.content ?? '<form id="frm1"></form>',
      waitForFunction: async () => {},
      waitForTimeout: async () => {},
      evaluate: async () => {
        if (typeof overrides.evaluate === 'function') {
          return overrides.evaluate();
        }
        return [];
      },
    };
    const context = {
      addCookies: async () => {},
      addInitScript: async () => {},
      newPage: async () => page,
      cookies: async () => [],
      ...overrides.context,
    };
    const browser = {
      newContext: async () => context,
      close: async () => {},
    };
    const handler = {
      loadSession: () => [
        { name: 'ACNT_COOKIE', value: 'abc', domain: '.jobkorea.co.kr', path: '/' },
      ],
      saveSession: () => {},
      createEntrySlots: async () => ({ career: [], license: [], award: [], school: 'c1' }),
      computeChanges: () => [],
      ...overrides.handler,
    };

    return {
      browser,
      handler,
      logger: (message, level, scope) => logs.push({ message, level, scope }),
      logs,
    };
  }

  it('throws when registerPortfolioUrl returns null by default', async () => {
    const harness = createSyncHarness();
    const ssot = { personal: { portfolio: 'https://portfolio.example.com' } };

    await assert.rejects(
      () =>
        syncJobKoreaProfile(harness.handler, ssot, {
          launchBrowser: async () => harness.browser,
          registerPortfolioUrl: async () => null,
          getTimestamp: () => '2026-04-21T10:00:00.000Z',
          logger: harness.logger,
        }),
      (error) => {
        assert.match(error.message, /JobKorea portfolio URL registration failed/);
        assert.match(error.message, /https:\/\/portfolio\.example\.com/);
        assert.match(error.message, /2026-04-21T10:00:00\.000Z/);
        return true;
      }
    );
  });

  it('throws when registerPortfolioUrl returns false or zero by default', async () => {
    const falsyResults = [false, 0];

    for (const falsyResult of falsyResults) {
      const harness = createSyncHarness();

      await assert.rejects(
        () =>
          syncJobKoreaProfile(
            harness.handler,
            { personal: { portfolio: 'https://portfolio.example.com' } },
            {
              launchBrowser: async () => harness.browser,
              registerPortfolioUrl: async () => falsyResult,
              getTimestamp: () => '2026-04-21T10:00:00.000Z',
              logger: harness.logger,
            }
          ),
        (error) => {
          assert.match(error.message, /JobKorea portfolio URL registration failed/);
          assert.match(error.message, /https:\/\/portfolio\.example\.com/);
          return true;
        }
      );
    }
  });

  it('continues with warning when JOBKOREA_PORTFOLIO_OPTIONAL=true', async () => {
    const harness = createSyncHarness();
    const original = process.env.JOBKOREA_PORTFOLIO_OPTIONAL;
    process.env.JOBKOREA_PORTFOLIO_OPTIONAL = 'true';

    try {
      const result = await syncJobKoreaProfile(
        harness.handler,
        { personal: { portfolio: 'https://portfolio.example.com' } },
        {
          launchBrowser: async () => harness.browser,
          registerPortfolioUrl: async () => null,
          getTimestamp: () => '2026-04-21T10:00:00.000Z',
          logger: harness.logger,
        }
      );

      assert.strictEqual(result.success, true);
      assert.ok(
        harness.logs.some(
          (entry) =>
            entry.level === 'warn' &&
            entry.message.includes('JobKorea portfolio URL registration failed')
        )
      );
    } finally {
      if (original === undefined) {
        delete process.env.JOBKOREA_PORTFOLIO_OPTIONAL;
      } else {
        process.env.JOBKOREA_PORTFOLIO_OPTIONAL = original;
      }
    }
  });

  it('persists refreshed JobKorea cookies from the Playwright context', async () => {
    const refreshedCookies = [
      { name: 'ACNT_COOKIE', value: 'fresh', domain: '.jobkorea.co.kr', path: '/' },
      { name: 'OTHER', value: 'ignored', domain: '.example.com', path: '/' },
    ];
    let savedCookies = null;
    const harness = createSyncHarness({
      context: {
        cookies: async () => refreshedCookies,
      },
      handler: {
        saveSession: (cookies) => {
          savedCookies = cookies;
        },
      },
    });

    const result = await syncJobKoreaProfile(
      harness.handler,
      { personal: { portfolio: 'https://portfolio.example.com' } },
      {
        launchBrowser: async () => harness.browser,
        registerPortfolioUrl: async () => 123,
        logger: harness.logger,
      }
    );

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(savedCookies, [refreshedCookies[0]]);
  });

  it('does not persist browser cookies when login verification fails', async () => {
    let saved = false;
    const harness = createSyncHarness({
      context: {
        cookies: async () => [
          { name: 'ACNT_COOKIE', value: 'partial', domain: '.jobkorea.co.kr', path: '/' },
        ],
      },
      handler: {
        saveSession: () => {
          saved = true;
        },
      },
    });

    const result = await syncJobKoreaProfile(
      harness.handler,
      { personal: { portfolio: 'https://portfolio.example.com' } },
      {
        launchBrowser: async () => harness.browser,
        assertJobKoreaResumeAccess: async () => {
          throw new Error('CAPTCHA required');
        },
        registerPortfolioUrl: async () => 123,
        logger: harness.logger,
      }
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(saved, false);
  });

  it('throws when CAPTCHA text is present on the page', async () => {
    const page = {
      url: () => 'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=30236578',
      content: async () => '<html><body>보안인증이 필요합니다</body></html>',
    };

    await assert.rejects(
      () => assertJobKoreaResumeAccess(page),
      (error) => {
        assert.match(error.message, /JobKorea CAPTCHA\/2FA required/);
        assert.match(
          error.message,
          new RegExp(JOBKOREA_SESSION_RENEW_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        );
        return true;
      }
    );
  });

  it('throws when the page redirects to /Login', async () => {
    const page = {
      url: () => 'https://www.jobkorea.co.kr/Login',
      content: async () => '<html><body>login</body></html>',
    };

    await assert.rejects(
      () => assertJobKoreaResumeAccess(page),
      (error) => {
        assert.match(error.message, /JobKorea CAPTCHA\/2FA required/);
        assert.match(error.message, /renew-jobkorea-session\.js/);
        return true;
      }
    );
  });
});

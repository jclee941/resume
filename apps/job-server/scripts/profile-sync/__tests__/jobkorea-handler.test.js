import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import JobKoreaHandler from '../jobkorea-handler.js';
import { syncJobKoreaProfile } from '../jobkorea-handler/sync.js';
import { createJobKoreaEntrySlots } from '../jobkorea-handler/section-slots.js';
import { resolveCliproxyBase } from '../jobkorea-handler/captcha-solver.js';
import SessionManager from '../../../src/shared/services/session/session-manager.js';
import {
  assertJobKoreaResumeAccess,
  assertEditableResume,
  waitForEditableForm,
  JOBKOREA_SESSION_RENEW_PATH,
} from '../jobkorea-handler/session.js';
import { PLATFORMS } from '../constants.js';

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
      { name: 'Career[c1].C_Name', value: 'Old Company' },
    ];
    const after = [
      { name: 'Career[c1].Co_Code_Extra', value: 'B' },
      { name: 'Career[c1].C_Name', value: 'New Company' },
    ];

    const changes = handler.computeChanges(before, after);

    assert.strictEqual(changes.length, 1);
    assert.deepStrictEqual(Object.keys(changes[0]).sort(), ['field', 'from', 'to']);
    assert.strictEqual(changes[0].field, 'Career c1 company');
    assert.strictEqual(changes[0].from, 'Old Company');
    assert.strictEqual(changes[0].to, 'New Company');
  });
  it('detects Language Lang1_Name changes from live JobKorea fields', () => {
    const before = [{ name: 'Language[c532].Lang1_Name', value: '' }];
    const after = [{ name: 'Language[c532].Lang1_Name', value: 'English' }];

    const changes = handler.computeChanges(before, after);

    assert.strictEqual(changes.length, 1);
    assert.deepStrictEqual(changes[0], {
      field: 'Language c532 name',
      from: '(empty)',
      to: 'English',
    });
  });

  it('ignores removed section fields that are not emitted by live JobKorea sync', () => {
    const before = [
      { name: 'Skill[c1].Skill_Name', value: '' },
      { name: 'Project[c1].P_Name', value: '' },
      { name: 'HopeJob.HJ_Name', value: '' },
      { name: 'HighSchool[c1].Schl_Name', value: '' },
    ];
    const after = [
      { name: 'Skill[c1].Skill_Name', value: 'Prometheus' },
      { name: 'Project[c1].P_Name', value: 'Proj A' },
      { name: 'HopeJob.HJ_Name', value: '보안 엔지니어' },
      { name: 'HighSchool[c1].Schl_Name', value: '용남고' },
    ];

    const changes = handler.computeChanges(before, after);

    assert.deepStrictEqual(changes, []);
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

  it('maps live JobKorea field names to readable labels', () => {
    assert.strictEqual(handler.describeField('Language[c532].Lang1_Name'), 'Language c532 name');
    assert.strictEqual(handler.describeField('UserResume.Birth_YMD'), 'Personal birth date');
  });

  it('maps Award field names to readable labels, including timestamp-based indices', () => {
    assert.strictEqual(handler.describeField('Award[c2].Award_Name'), 'Award c2 name');
    assert.strictEqual(
      handler.describeField('Award[1_1778240625462].Award_Name'),
      'Award 1_1778240625462 name'
    );
    assert.strictEqual(
      handler.describeField('Award[1_1778240625462].Award_Inst_Name'),
      'Award 1_1778240625462 organization'
    );
    assert.strictEqual(
      handler.describeField('Award[1_1778240625462].Award_Year'),
      'Award 1_1778240625462 year'
    );
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

describe('createJobKoreaEntrySlots', () => {
  it('reuses existing live DOM indices, including timestamp Award IDs', async () => {
    const readCalls = [];
    const handler = {
      readSectionIndices: async (_page, prefix) => {
        readCalls.push(prefix);
        const indices = {
          Career: ['c6'],
          License: ['c18'],
          Award: ['1_1778240625462', '2_1778240625463'],
          UnivSchool: ['c2'],
          Portfolio: [],
          Language: ['c532'],
        };
        return indices[prefix] || [];
      },
    };
    const page = {
      waitForFunction: async () => {},
      evaluate: async () => false,
    };
    const ssot = {
      careers: [{ company: 'Company' }],
      certifications: [{ name: 'Cert', date: '2020.08' }],
      awards: [
        { name: 'Award A', organization: 'Org A', year: '2026' },
        { name: 'Award B', organization: 'Org B', year: '2025' },
      ],
      languages: [{ name: 'English' }],
      personal: {},
      skills: {
        observability: { items: [{ name: 'Prometheus' }] },
      },
      personalProjects: [{ name: 'Project A' }],
    };

    const indices = await createJobKoreaEntrySlots(handler, page, ssot);

    assert.deepStrictEqual(indices.career, ['c6']);
    assert.deepStrictEqual(indices.license, ['c18']);
    assert.deepStrictEqual(indices.award, ['1_1778240625462', '2_1778240625463']);
    assert.strictEqual(indices.school, 'c2');
    assert.deepStrictEqual(indices.language, ['c532']);
    assert.ok(!Object.hasOwn(indices, 'skill'));
    assert.ok(!Object.hasOwn(indices, 'personalProject'));
    assert.ok(readCalls.includes('Award'));
    assert.ok(readCalls.includes('Language'));
    assert.ok(!readCalls.includes('Skill'));
    assert.ok(!readCalls.includes('Project'));
  });

  it('uses post-addition DOM indices when more live slots are needed', async () => {
    const callCounts = new Map();
    const handler = {
      readSectionIndices: async (_page, prefix) => {
        const count = callCounts.get(prefix) || 0;
        callCounts.set(prefix, count + 1);
        if (prefix === 'Award' && count >= 1) {
          return ['1_1778240625462', '2_1778240625463'];
        }
        if (prefix === 'Award') {
          return ['1_1778240625462'];
        }
        if (prefix === 'UnivSchool') return ['c2'];
        return [];
      },
    };
    const page = {
      waitForFunction: async () => {},
      evaluate: async () => true,
    };
    const ssot = {
      careers: [],
      certifications: [],
      awards: [
        { name: 'Award A', organization: 'Org A', year: '2026' },
        { name: 'Award B', organization: 'Org B', year: '2025' },
      ],
      languages: [],
      personal: {},
    };

    const indices = await createJobKoreaEntrySlots(handler, page, ssot);

    assert.deepStrictEqual(indices.award, ['1_1778240625462', '2_1778240625463']);
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
  let savedRno;
  beforeEach(() => {
    savedRno = process.env.JOBKOREA_RNO;
    process.env.JOBKOREA_RNO = '30236578';
  });
  afterEach(() => {
    if (savedRno === undefined) delete process.env.JOBKOREA_RNO;
    else process.env.JOBKOREA_RNO = savedRno;
  });
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
      locator: () => ({ count: async () => 1 }),
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

describe('PLATFORMS.jobkorea URL getters (rNo handling)', () => {
  let savedRno;
  beforeEach(() => {
    savedRno = process.env.JOBKOREA_RNO;
  });
  afterEach(() => {
    if (savedRno === undefined) delete process.env.JOBKOREA_RNO;
    else process.env.JOBKOREA_RNO = savedRno;
  });

  it('S1: does NOT fabricate 30236578 when JOBKOREA_RNO is unset', () => {
    delete process.env.JOBKOREA_RNO;
    const { profileUrl, editUrl } = PLATFORMS.jobkorea;
    assert.ok(!profileUrl.includes('30236578'), `profileUrl must not contain 30236578: ${profileUrl}`);
    assert.ok(!editUrl.includes('30236578'), `editUrl must not contain 30236578: ${editUrl}`);
  });

  it('S2: uses provided JOBKOREA_RNO in both URLs', () => {
    process.env.JOBKOREA_RNO = '9028903';
    const { profileUrl, editUrl } = PLATFORMS.jobkorea;
    assert.match(profileUrl, /rNo=9028903/);
    assert.match(editUrl, /RNo=9028903/);
  });
});

describe('assertEditableResume (ResumeMng / file-upload guard)', () => {
  it('S3: throws fail-loud error when redirected to /User/ResumeMng', async () => {
    const page = {
      url: () => 'https://www.jobkorea.co.kr/User/ResumeMng',
    };

    await assert.rejects(
      () => assertEditableResume(page, { rNo: '9028903' }),
      (error) => {
        assert.strictEqual(error.failLoud, true, 'error.failLoud must be true');
        assert.match(error.message, /ResumeMng/);
        assert.match(error.message, /file[- ]upload/i);
        assert.match(error.message, /9028903/);
        return true;
      }
    );
  });

  it('S3b: passes (URL-only guard) when on an editable Resume/Edit URL', async () => {
    const page = {
      url: () => 'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=9028903',
    };
    await assert.doesNotReject(() => assertEditableResume(page, { rNo: '9028903' }));
  });
});

describe('waitForEditableForm (#frm1 wait with fail-loud on timeout)', () => {
  it('S6: resolves when #frm1 appears (sync waitForFunction)', async () => {
    let calls = 0;
    const page = {
      url: () => 'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=9028903',
      waitForFunction: async () => {
        calls += 1;
        return true; // form attached within wait window
      },
    };
    await assert.doesNotReject(() => waitForEditableForm(page, { rNo: '9028903' }));
    assert.strictEqual(calls, 1, 'waitForFunction must be invoked once');
  });

  it('S6b: async-attached form (waitForFunction resolves after delay) still passes', async () => {
    const page = {
      url: () => 'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=9028903',
      waitForFunction: async () => {
        await new Promise((r) => setTimeout(r, 20)); // form attaches late
        return true;
      },
    };
    await assert.doesNotReject(() => waitForEditableForm(page, { rNo: '9028903' }));
  });

  it('S6c: converts waitForFunction timeout into fail-loud editable-resume error', async () => {
    const page = {
      url: () => 'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=9028903',
      waitForFunction: async () => {
        const err = new Error('Timeout 15000ms exceeded waiting for function');
        err.name = 'TimeoutError';
        throw err;
      },
    };
    await assert.rejects(
      () => waitForEditableForm(page, { rNo: '9028903' }),
      (error) => {
        assert.strictEqual(error.failLoud, true, 'timeout must become failLoud');
        assert.match(error.message, /file[- ]upload/i);
        assert.match(error.message, /9028903/);
        return true;
      }
    );
  });

  it('S6d: re-throws non-timeout errors unchanged (no masking)', async () => {
    const page = {
      url: () => 'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=9028903',
      waitForFunction: async () => {
        throw new Error('boom unrelated navigation error');
      },
    };
    await assert.rejects(
      () => waitForEditableForm(page, { rNo: '9028903' }),
      (error) => {
        assert.match(error.message, /boom unrelated/);
        assert.notStrictEqual(error.failLoud, true);
        return true;
      }
    );
  });

  it('S6e: re-throws non-timeout waitForFunction errors unchanged (no masking via API-name match)', async () => {
    const page = {
      url: () => 'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=9028903',
      waitForFunction: async () => {
        // Playwright non-timeout error that mentions the API name in its message.
        throw new Error('page.waitForFunction: Execution context was destroyed');
      },
    };
    await assert.rejects(
      () => waitForEditableForm(page, { rNo: '9028903' }),
      (error) => {
        assert.match(error.message, /Execution context was destroyed/);
        assert.notStrictEqual(error.failLoud, true, 'non-timeout error must NOT be masked as failLoud');
        return true;
      }
    );
  });
});

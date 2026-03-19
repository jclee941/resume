import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import JobKoreaHandler from '../jobkorea-handler.js';

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
      { name: 'Career[c1].Co_Code', value: 'A' },
      { name: 'HopeJob.HJ_Name', value: '시스템엔지니어' },
    ];
    const after = [
      { name: 'Career[c1].Co_Code', value: 'B' },
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
  let writtenData;

  beforeEach(() => {
    handler = new JobKoreaHandler();
    writtenData = null;
    mock.method(fs, 'mkdirSync', () => {});
    mock.method(fs, 'writeFileSync', (_filePath, data) => {
      writtenData = JSON.parse(data);
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
    mock.method(fs, 'readFileSync', () => JSON.stringify(existingSession));

    const newCookies = [
      { name: 'ACNT_COOKIE', value: 'abc123' },
      { name: 'SES_ID', value: 'xyz789' },
    ];
    handler.saveSession(newCookies);

    // Metadata from auth-persistent.js preserved
    assert.strictEqual(writtenData.platform, 'jobkorea');
    assert.strictEqual(writtenData.expiresAt, '2026-04-01T00:00:00.000Z');
    // Cookies updated to new values
    assert.strictEqual(writtenData.cookies.length, 2);
    assert.strictEqual(writtenData.cookies[0].name, 'ACNT_COOKIE');
    assert.strictEqual(writtenData.cookieString, 'ACNT_COOKIE=abc123; SES_ID=xyz789');
    assert.strictEqual(writtenData.cookieCount, 2);
    // extractedAt refreshed on save
    assert.notStrictEqual(writtenData.extractedAt, '2026-03-15T00:00:00.000Z');
  });

  it('populates defaults when no existing session file', () => {
    mock.method(fs, 'readFileSync', () => {
      throw new Error('ENOENT');
    });

    const cookies = [{ name: 'test', value: 'val' }];
    handler.saveSession(cookies);

    assert.strictEqual(writtenData.platform, 'jobkorea');
    assert.ok(writtenData.expiresAt);
    assert.strictEqual(writtenData.cookies.length, 1);
    assert.strictEqual(writtenData.cookieString, 'test=val');
    assert.strictEqual(writtenData.cookieCount, 1);
    assert.ok(writtenData.extractedAt);
  });

  it('builds correct cookieString from cookie array', () => {
    mock.method(fs, 'readFileSync', () => {
      throw new Error('ENOENT');
    });

    const cookies = [
      { name: 'A', value: '1' },
      { name: 'B', value: '2' },
      { name: 'C', value: '3' },
    ];
    handler.saveSession(cookies);

    assert.strictEqual(writtenData.cookieString, 'A=1; B=2; C=3');
    assert.strictEqual(writtenData.cookieCount, 3);
  });

  it('normalizes legacy array session to object with metadata', () => {
    // loadSession() at line 22 supports legacy bare-array format
    const legacyArray = [
      { name: 'ACNT_COOKIE', value: 'legacy123', domain: '.jobkorea.co.kr' },
    ];
    mock.method(fs, 'readFileSync', () => JSON.stringify(legacyArray));

    const newCookies = [
      { name: 'ACNT_COOKIE', value: 'updated456' },
      { name: 'SES_ID', value: 'new789' },
    ];
    handler.saveSession(newCookies);

    // Must produce an object, not an array with attached properties
    assert.ok(!Array.isArray(writtenData), 'saved session must be an object, not array');
    assert.strictEqual(writtenData.platform, 'jobkorea');
    assert.ok(writtenData.expiresAt, 'must have expiresAt default');
    assert.strictEqual(writtenData.cookies.length, 2);
    assert.strictEqual(writtenData.cookieString, 'ACNT_COOKIE=updated456; SES_ID=new789');
    assert.strictEqual(writtenData.cookieCount, 2);
    assert.ok(writtenData.extractedAt);
  });
});

describe('JobKoreaHandler.loadSession - auth-sync compatibility', () => {
  let handler;

  beforeEach(() => {
    handler = new JobKoreaHandler({}, {});
    mock.restoreAll();
  });

  it('loads cookie array from auth-sync-style session (cookies as objects)', () => {
    // auth-sync/cookie-ops.js now saves cookies as array of cookie objects
    const authSyncSession = {
      platform: 'jobkorea',
      cookies: [
        { name: 'ACNT_COOKIE', value: 'abc', domain: '.jobkorea.co.kr', path: '/' },
        { name: 'SES_ID', value: 'xyz', domain: '.jobkorea.co.kr', path: '/' },
      ],
      cookieString: 'ACNT_COOKIE=abc; SES_ID=xyz',
      cookieCount: 2,
      extractedAt: '2026-03-18T00:00:00.000Z',
      expiresAt: '2026-03-19T00:00:00.000Z',
    };

    mock.method(fs, 'existsSync', () => true);
    mock.method(fs, 'readFileSync', () => JSON.stringify(authSyncSession));

    const result = handler.loadSession();
    assert.ok(Array.isArray(result), 'must return array');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'ACNT_COOKIE');
    assert.strictEqual(result[1].domain, '.jobkorea.co.kr');
  });
});

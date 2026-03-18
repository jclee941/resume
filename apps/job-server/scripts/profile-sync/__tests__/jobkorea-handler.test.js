import { describe, it } from 'node:test';
import assert from 'node:assert';
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

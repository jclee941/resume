import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildJobKoreaFormData } from '../jobkorea-sections.js';
import { loadSSOT } from '../ssot-loader.js';

function toMap(fields) {
  return new Map(fields.map((field) => [field.name, String(field.value ?? '')]));
}

function matchingFields(fields, regex) {
  return fields.filter((field) => regex.test(field.name));
}

function nonEmptyMatchingValues(fields, regex) {
  return matchingFields(fields, regex)
    .map((field) => String(field.value ?? ''))
    .filter((value) => value.trim().length > 0);
}

function assertAtLeastOneNonEmpty(fields, regex, message) {
  const values = nonEmptyMatchingValues(fields, regex);
  assert.ok(values.length > 0, `${message}; found ${values.length}`);
}

describe('JobKorea new resume payload contract from real SSoT', () => {
  const realSSoT = loadSSOT();
  const fields = buildJobKoreaFormData(realSSoT, {});
  const byName = toMap(fields);

  it('normalizes all field values to strings', () => {
    for (const field of fields) {
      assert.strictEqual(
        typeof field.value,
        'string',
        `${field.name} should be string, got ${typeof field.value}`
      );
    }
  });

  it('includes complete career section fields and career text', () => {
    const expectedCareerCount = Array.isArray(realSSoT.careers) ? realSSoT.careers.length : 0;
    const careerNames = nonEmptyMatchingValues(fields, /^Career\[c\d+\]\.C_Name$/);

    assert.ok(
      careerNames.length >= expectedCareerCount,
      `expected at least ${expectedCareerCount} non-empty career names, got ${careerNames.length}`
    );
    assert.ok(
      (byName.get('UserResume.M_Career_Text') ?? '').trim().length > 0,
      `UserResume.M_Career_Text should be non-empty, got ${JSON.stringify(
        byName.get('UserResume.M_Career_Text')
      )}`
    );
  });

  it('includes university education from real SSoT', () => {
    assert.strictEqual(byName.get('UnivSchool[c1].Schl_Name'), realSSoT.education.school);
  });

  it('includes at least one dated license', () => {
    assertAtLeastOneNonEmpty(fields, /^License\[c\d+\]\.Lc_Name$/, 'expected License[cN].Lc_Name');
  });

  it('includes military status', () => {
    assert.ok(
      (byName.get('UserAddition.Military_Stat') ?? '').trim().length > 0,
      `UserAddition.Military_Stat should be non-empty, got ${JSON.stringify(
        byName.get('UserAddition.Military_Stat')
      )}`
    );
  });

  it('includes at least one award', () => {
    assertAtLeastOneNonEmpty(fields, /^Award\[c\d+\]\.Award_Name$/, 'expected Award[cN].Award_Name');
  });

  it('includes language names and mapped language levels', () => {
    assertAtLeastOneNonEmpty(fields, /^Language\[c\d+\]\.Lang1_Name$/, 'expected Language[cN].Lang1_Name');
    assertAtLeastOneNonEmpty(fields, /^Language\[c\d+\]\.Lang1_Stat$/, 'expected Language[cN].Lang1_Stat');
  });

  it('includes normalized personal identity and links', () => {
    const birthYmd = byName.get('UserResume.Birth_YMD');

    assert.strictEqual(
      birthYmd,
      '19941017',
      `UserResume.Birth_YMD should normalize ${realSSoT.personal.birthDate} to 19941017; got ${JSON.stringify(
        birthYmd
      )}`
    );
    assert.match(birthYmd ?? '', /^\d{8}$/, 'UserResume.Birth_YMD should be 8 digits');
    assert.ok(
      (byName.get('UserResume.Address') ?? '').trim().length > 0,
      `UserResume.Address should be non-empty, got ${JSON.stringify(byName.get('UserResume.Address'))}`
    );
    assert.ok(
      (byName.get('UserResume.GitHub') ?? '').trim().length > 0,
      `UserResume.GitHub should be non-empty, got ${JSON.stringify(byName.get('UserResume.GitHub'))}`
    );
  });

  it('includes skills for the new resume payload', () => {
    assertAtLeastOneNonEmpty(fields, /^Skill\[c\d+\]\.Skill_Name$/, 'expected Skill[cN].Skill_Name');
  });

  it('includes hope job fields for the new resume payload', () => {
    assertAtLeastOneNonEmpty(fields, /^HopeJob\.HJ_/, 'expected HopeJob.HJ_* field');
  });

  it('includes personal project fields for the new resume payload', () => {
    assertAtLeastOneNonEmpty(fields, /^Project\[c\d+\]\.P_Name$/, 'expected Project[cN].P_Name');
  });

  it('includes high school from real SSoT education', () => {
    // JobKorea's live form expects scalar HighSchool.* names (not indexed),
    // verified against the real Save endpoint.
    assert.strictEqual(
      byName.get('HighSchool.Schl_Name'),
      realSSoT.education.highSchool,
      `HighSchool.Schl_Name should match ${JSON.stringify(realSSoT.education.highSchool)}; got ${JSON.stringify(
        byName.get('HighSchool.Schl_Name')
      )}`
    );
  });

  it('does not include auth/session/cookie/token/password material', () => {
    const serialized = JSON.stringify(fields);
    // Reject real credential material (cookie headers, token/password
    // assignments, JobKorea auth cookies) without flagging tool names like
    // "1Password" that legitimately appear in resume prose.
    assert.doesNotMatch(
      serialized,
      /(?:^|[^0-9a-z])(?:password|secret|token|bearer)\s*[:=]|set-cookie|cookie:\s|authorization:|ACNT_COOKIE|SES_ID|\bjkat\b|\bjkrt\b|sessionid/i
    );
  });

  it('is deterministic across repeated builds', () => {
    const first = JSON.stringify(buildJobKoreaFormData(realSSoT, {}));
    const second = JSON.stringify(buildJobKoreaFormData(realSSoT, {}));

    assert.strictEqual(first, second);
  });

  it('does not duplicate field names for the first career', () => {
    const firstCareerNames = fields
      .map((field) => field.name)
      .filter((name) => /^Career\[c1\]\./.test(name));
    const counts = new Map();

    for (const name of firstCareerNames) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    const duplicates = [...counts.entries()].filter(([, count]) => count > 1);
    assert.deepStrictEqual(duplicates, [], `duplicate Career[c1].* fields: ${JSON.stringify(duplicates)}`);
  });
});

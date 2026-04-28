import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildJobKoreaFormData,
  JK_JOB_CODES,
  JK_LOCATION_CODES,
  mapAwardToFormFields,
  mapCareersToFormFields,
  normalizeCompanyName,
  mapHopeJobToFormFields,
  mapLicensesToFormFields,
  mapMilitaryToFormFields,
  mapPortfolioToFormFields,
  mapSchoolToFormFields,
  parseRange,
  toYYYYMM,
} from '../jobkorea-sections.js';
import { loadSSOT } from '../utils.js';

function toMap(fields) {
  return new Map(fields.map((field) => [field.name, String(field.value ?? '')]));
}

function countMatching(fields, regex) {
  return fields.filter((field) => regex.test(field.name)).length;
}

describe('jobkorea-sections helpers', () => {
  it('toYYYYMM maps YYYY.MM to YYYYMM', () => {
    assert.strictEqual(toYYYYMM('2024.03'), '202403');
  });

  it('toYYYYMM returns empty string for nullish input', () => {
    assert.strictEqual(toYYYYMM(null), '');
    assert.strictEqual(toYYYYMM(undefined), '');
  });

  it('toYYYYMM preserves full dotted date tokens', () => {
    assert.strictEqual(toYYYYMM('2024.03.15'), '20240315');
  });

  it('parseRange handles current period', () => {
    assert.deepStrictEqual(parseRange('2024.03 ~ 현재'), {
      start: '202403',
      end: '',
      isCurrent: true,
    });
  });

  it('parseRange handles dashed period', () => {
    assert.deepStrictEqual(parseRange('2014.12 - 2016.12'), {
      start: '201412',
      end: '201612',
      isCurrent: false,
    });
  });
});

describe('mapCareersToFormFields', () => {
  const baseCareer = {
    company: '(주)아이티센 CTS',
    period: '2025.03 ~ 2026.02',
    role: '보안운영 담당',
    department: '정보보안팀',
    description: 'Splunk 기반 보안 로그 분석',
  };

  it('maps expected career field names and values with default index', () => {
    const fields = mapCareersToFormFields({ careers: [baseCareer] });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c1].C_Name'), '아이티센 CTS');
    assert.strictEqual(byName.get('Career[c1].C_Part'), '정보보안팀');
    assert.strictEqual(byName.get('Career[c1].CSYM'), '202503');
    assert.strictEqual(byName.get('Career[c1].CEYM'), '202602');
    assert.strictEqual(byName.get('Career[c1].M_MainField'), '');
    assert.strictEqual(byName.get('Career.index'), 'c1');
  });

  it('uses provided server-generated indices', () => {
    const fields = mapCareersToFormFields({ careers: [baseCareer] }, ['c844']);
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c844].Index_Name'), 'c844');
    assert.strictEqual(byName.get('Career[c844].C_Name'), '아이티센 CTS');
    assert.strictEqual(byName.get('Career.index'), 'c844');
  });

  it('sets RetireSt to 1 and open end date for 현재 period', () => {
    const fields = mapCareersToFormFields({
      careers: [{ ...baseCareer, period: '2024.03 ~ 현재' }],
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c1].CSYM'), '202403');
    assert.strictEqual(byName.get('Career[c1].CEYM'), '');
    assert.strictEqual(byName.get('Career[c1].RetireSt'), '1');
  });

  it('truncates long description to 500 chars', () => {
    const longDescription = 'a'.repeat(800);
    const fields = mapCareersToFormFields({
      careers: [{ ...baseCareer, description: longDescription }],
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c1].Prfm_Prt').length, 500);
  });

  it('falls back to default job code for unknown role', () => {
    const fields = mapCareersToFormFields({ careers: [{ ...baseCareer, role: '알수없음직무' }] });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c1].M_MainField'), '');
    assert.strictEqual(byName.get('Career[c1].M_MainJob'), '');
  });
});

describe('mapSchoolToFormFields', () => {
  const ssotEducation = {
    education: {
      school: '한양사이버대학교',
      major: '컴퓨터공학과',
      startDate: '2024.03',
      status: '재학중',
    },
  };

  it('maps school name and major path', () => {
    const fields = mapSchoolToFormFields(ssotEducation, 'c10');
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UnivSchool[c10].Schl_Name'), '한양사이버대학교');
    assert.strictEqual(byName.get('UnivSchool[c10].UnivMajor[0].Major_Name'), '컴퓨터공학과');
    assert.strictEqual(byName.get('UnivSchool.index'), 'c10');
  });

  it('estimates grad year for 재학중 and sets grad type code', () => {
    const fields = mapSchoolToFormFields(ssotEducation);
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UnivSchool[c1].Entc_YM'), '202403');
    assert.strictEqual(byName.get('UnivSchool[c1].Grad_YM'), '202802');
    assert.strictEqual(byName.get('UnivSchool[c1].Grad_Type_Code'), '4');
  });

  it('uses endDate and graduated code when status is 졸업', () => {
    const fields = mapSchoolToFormFields({
      education: {
        school: '테스트대학교',
        major: '전산학',
        startDate: '2014.03',
        endDate: '2018.02',
        status: '졸업',
      },
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UnivSchool[c1].Grad_YM'), '201802');
    assert.strictEqual(byName.get('UnivSchool[c1].Grad_Type_Code'), '10');
  });

  it('BUG-J1: derives Schl_Type_Code from SSoT (KO 4년제 → 2)', () => {
    const fields = mapSchoolToFormFields({
      education: { school: '테스트대', major: '전산', startDate: '2020.03', status: '재학중', schoolType: '4년제', majorType: '전공' },
    });
    const byName = toMap(fields);
    assert.strictEqual(byName.get('UnivSchool[c1].Schl_Type_Code'), '2');
    assert.strictEqual(byName.get('UnivSchool[c1].UnivMajor[0].Major_Type_Code'), '1');
  });

  it('BUG-J1: maps EN locale aliases (4-year → 2, Major → 1)', () => {
    const fields = mapSchoolToFormFields({
      education: { school: 'Test U', major: 'CS', startDate: '2020.03', status: '재학중', schoolType: '4-year', majorType: 'Major' },
    });
    const byName = toMap(fields);
    assert.strictEqual(byName.get('UnivSchool[c1].Schl_Type_Code'), '2');
    assert.strictEqual(byName.get('UnivSchool[c1].UnivMajor[0].Major_Type_Code'), '1');
  });

  it('BUG-J1: maps JA locale aliases (4年制 → 2, 専攻 → 1)', () => {
    const fields = mapSchoolToFormFields({
      education: { school: 'テスト大', major: 'CS', startDate: '2020.03', status: '재학중', schoolType: '4年制', majorType: '専攻' },
    });
    const byName = toMap(fields);
    assert.strictEqual(byName.get('UnivSchool[c1].Schl_Type_Code'), '2');
    assert.strictEqual(byName.get('UnivSchool[c1].UnivMajor[0].Major_Type_Code'), '1');
  });

  it('BUG-J1: defaults to 4년제 (code 2) when schoolType is missing or unknown', () => {
    const fields = mapSchoolToFormFields({
      education: { school: '테스트대', major: '전산', startDate: '2020.03', status: '재학중' },
    });
    const byName = toMap(fields);
    assert.strictEqual(byName.get('UnivSchool[c1].Schl_Type_Code'), '2');
    assert.strictEqual(byName.get('UnivSchool[c1].UnivMajor[0].Major_Type_Code'), '1');
  });

  it('BUG-J1: maps 고등학교 (KO) → 11 and 대학원 (KO) → 12', () => {
    const hs = mapSchoolToFormFields({
      education: { school: '용남고', startDate: '2010.03', endDate: '2013.02', status: '졸업', schoolType: '고등학교' },
    });
    const grad = mapSchoolToFormFields({
      education: { school: '대학원', startDate: '2018.03', endDate: '2020.02', status: '졸업', schoolType: '대학원' },
    });
    assert.strictEqual(toMap(hs).get('UnivSchool[c1].Schl_Type_Code'), '11');
    assert.strictEqual(toMap(grad).get('UnivSchool[c1].Schl_Type_Code'), '12');
  });
});

describe('mapLicensesToFormFields', () => {
  const certs = [
    { name: 'CCNP', issuer: 'Cisco Systems', date: '2020.08', status: 'expired' },
    { name: 'CISSP', issuer: 'ISC²', date: null, status: '준비중' },
    { name: 'RHCSA', issuer: 'Red Hat', date: '2019.01', status: 'expired' },
  ];

  it('filters out certifications without date (준비중)', () => {
    const fields = mapLicensesToFormFields({ certifications: certs });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('License.index'), 'c1,c2');
    assert.strictEqual(countMatching(fields, /^License\[c\d+\]\.Lc_Name$/), 2);
  });

  it('maps Lc_YYMM as YYYYMM', () => {
    const fields = mapLicensesToFormFields({ certifications: certs }, ['c31', 'c41']);
    const byName = toMap(fields);

    assert.strictEqual(byName.get('License[c31].Lc_YYMM'), '202008');
    assert.strictEqual(byName.get('License[c41].Lc_YYMM'), '201901');
  });

  it('returns empty when all certs lack date', () => {
    const fields = mapLicensesToFormFields({
      certifications: [{ name: 'CISM', issuer: 'ISACA', date: null, status: '준비중' }],
    });
    assert.deepStrictEqual(fields, []);
  });
});

describe('mapMilitaryToFormFields', () => {
  it('maps 사회복무요원 to status 4 and kind 7', () => {
    const fields = mapMilitaryToFormFields({
      military: { status: '사회복무요원', period: '2014.12 - 2016.12' },
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UserAddition.Military_Stat'), '4');
    assert.strictEqual(byName.get('UserAddition.Military_Kind'), '7');
  });

  it('parses military date range from dashed period format', () => {
    const fields = mapMilitaryToFormFields({
      military: { status: '군필', period: '2014.12 - 2016.12' },
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UserAddition.Military_SYM'), '201412');
    assert.strictEqual(byName.get('UserAddition.Military_EYM'), '201612');
  });
});

describe('mapAwardToFormFields', () => {
  it('returns [] when only achievements[] present (no fallback)', () => {
    const fields = mapAwardToFormFields({ achievements: ['A', 'B'] });
    assert.deepStrictEqual(fields, []);
  });

  it('returns [] for empty awards array', () => {
    assert.deepStrictEqual(mapAwardToFormFields({ awards: [] }), []);
  });

  it('maps structured awards input when explicitly provided', () => {
    const fields = mapAwardToFormFields(
      {
        awards: [{ name: '우수상', organization: '한양사이버대학교', year: '2026' }],
      },
      ['c7']
    );
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Award[c7].Award_Name'), '우수상');
    assert.strictEqual(byName.get('Award[c7].Award_Inst_Name'), '한양사이버대학교');
    assert.strictEqual(byName.get('Award[c7].Award_Year'), '2026');
    assert.strictEqual(byName.get('Award.index'), 'c7');
  });
});

describe('mapPortfolioToFormFields', () => {
  it('returns Attach_File_Name and InputStat with valid IDX', () => {
    const fields = mapPortfolioToFormFields(
      { personal: { portfolio: 'https://resume.jclee.me' } },
      13479802
    );
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UserResume.Attach_File_Name'), '13479802,');
    assert.strictEqual(byName.get('InputStat.PortfolioInputStat'), 'True');
  });

  it('returns empty when no portfolio URL in SSoT', () => {
    assert.deepStrictEqual(mapPortfolioToFormFields({ personal: {} }, 123), []);
    assert.deepStrictEqual(mapPortfolioToFormFields({ personal: { portfolio: '' } }, 123), []);
  });

  it('returns empty when no fileIdx provided', () => {
    assert.deepStrictEqual(
      mapPortfolioToFormFields({ personal: { portfolio: 'https://x.com' } }, null),
      []
    );
    assert.deepStrictEqual(
      mapPortfolioToFormFields({ personal: { portfolio: 'https://x.com' } }, undefined),
      []
    );
  });

  it('includes portfolio fields in buildJobKoreaFormData when fileIdx present', () => {
    const ssot = {
      personal: { portfolio: 'https://resume.jclee.me' },
      careers: [],
      education: null,
      certifications: [],
      military: null,
      awards: [],
    };
    const fields = buildJobKoreaFormData(ssot, { portfolioFileIdx: 99999 });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UserResume.Attach_File_Name'), '99999,');
    assert.strictEqual(byName.get('InputStat.PortfolioInputStat'), 'True');
  });

  it('omits portfolio fields from buildJobKoreaFormData when no fileIdx', () => {
    const ssot = {
      personal: { portfolio: 'https://resume.jclee.me' },
      careers: [],
      education: null,
      certifications: [],
      military: null,
      awards: [],
    };
    const fields = buildJobKoreaFormData(ssot, {});
    const portFields = fields.filter((f) => f.name === 'UserResume.Attach_File_Name');

    assert.strictEqual(portFields.length, 0);
  });
});

describe('mapHopeJobToFormFields', () => {
  it('exports lookup tables for role and location mapping', () => {
    assert.strictEqual(JK_JOB_CODES['보안 엔지니어'], 1000238);
    assert.strictEqual(JK_LOCATION_CODES.서울, 'I000');
    assert.strictEqual(JK_LOCATION_CODES.경기, 'I100');
  });

  it('falls back once and logs a single warning for unmapped hope roles', () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));

    try {
      const fields = mapHopeJobToFormFields({ hope: { roles: ['DevOps'] } });
      const byName = toMap(fields);

      assert.strictEqual(byName.get('HopeJob.HJ_Code'), '10031');
      assert.strictEqual(byName.get('HopeJob.HJ_Name_Code'), '1000233,1000238');
      assert.strictEqual(byName.get('HopeJob.HJ_Name'), '시스템엔지니어,보안엔지니어');
      assert.strictEqual(warnings.length, 1);
      assert.match(warnings[0], /Unmapped HopeJob roles skipped: DevOps/);
    } finally {
      console.warn = originalWarn;
    }
  });

  it('maps hope roles with known system and security engineer labels', () => {
    const fields = mapHopeJobToFormFields({
      hope: { roles: ['시스템 엔지니어', '보안 엔지니어'] },
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('HopeJob.HJ_Code'), '10031');
    assert.strictEqual(byName.get('HopeJob.HJ_Name_Code'), '1000233,1000238');
    assert.strictEqual(byName.get('HopeJob.HJ_Name'), '시스템 엔지니어,보안 엔지니어');
    assert.strictEqual(byName.get('InputStat.HopeJobInputStat'), 'True');
  });

  it('maps hope locations through exported location codes', () => {
    const fields = mapHopeJobToFormFields({
      hope: { locations: ['서울', '경기'] },
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('HopeJob.HJ_Local_Code'), 'I000,I100');
    assert.strictEqual(byName.get('HopeJob.HJ_Local_Name'), '서울,경기');
  });

  it('falls back to careers when no hope section exists', () => {
    const fields = mapHopeJobToFormFields({
      careers: [{ role: '시스템 엔지니어' }, { role: '보안 엔지니어' }],
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('HopeJob.HJ_Name_Code'), '1000233,1000238');
    assert.strictEqual(byName.get('HopeJob.HJ_Name'), '시스템 엔지니어,보안 엔지니어');
    assert.strictEqual(byName.get('InputStat.HopeJobInputStat'), 'True');
  });
});

describe('buildJobKoreaFormData', () => {
  const fullSSOT = {
    careers: [
      {
        company: '(주)아이티센 CTS',
        period: '2025.03 ~ 2026.02',
        role: '보안운영 담당',
        description: 'desc',
      },
    ],
    education: {
      school: '한양사이버대학교',
      major: '컴퓨터공학과',
      startDate: '2024.03',
      status: '재학중',
    },
    certifications: [{ name: 'CCNP', issuer: 'Cisco Systems', date: '2020.08' }],
    military: { status: '사회복무요원', period: '2014.12 - 2016.12' },
    awards: [{ name: '우수상', organization: '한양사이버대학교', year: '2026' }],
  };

  it('combines all mapped sections into one field array', () => {
    const fields = buildJobKoreaFormData(fullSSOT, {});
    const names = fields.map((field) => field.name);

    assert.ok(names.some((name) => name.startsWith('Career[')));
    assert.ok(names.some((name) => name.startsWith('UnivSchool[')));
    assert.ok(names.some((name) => name.startsWith('License[')));
    assert.ok(names.some((name) => name.startsWith('UserAddition.')));
    assert.ok(names.some((name) => name.startsWith('HopeJob.')));
  });

  it('respects provided sectionIndices', () => {
    const fields = buildJobKoreaFormData(fullSSOT, {
      career: ['c77'],
      school: 'c88',
      license: ['c99'],
      award: ['c55'],
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c77].Index_Name'), 'c77');
    assert.strictEqual(byName.get('UnivSchool[c88].Schl_Name'), '한양사이버대학교');
    assert.strictEqual(byName.get('License[c99].Index_Name'), 'c99');
    // structured awards[]; indices=['c55'] limits to 1 entry = 5 fields
    assert.strictEqual(countMatching(fields, /^Award\[/), 5);
  });

  it('returns non-empty field list for valid SSOT', () => {
    const fields = buildJobKoreaFormData(fullSSOT, {});
    assert.ok(fields.length > 0);
  });

  it('normalizes all field values to strings', () => {
    const fields = buildJobKoreaFormData(fullSSOT, {});
    assert.ok(fields.every((field) => typeof field.value === 'string'));
  });
});

describe('dry-run smoke with real SSOT', () => {
  it('builds form data from real resume_data.json with expected section counts', () => {
    const ssot = loadSSOT();

    assert.doesNotThrow(() => buildJobKoreaFormData(ssot, {}));
    const fields = buildJobKoreaFormData(ssot, {});

    assert.ok(fields.length > 0);
    assert.ok(fields.every((field) => typeof field.value === 'string'));

    const expectedCareerCount = Array.isArray(ssot.careers) ? ssot.careers.length : 0;
    const expectedLicenseCount = (
      Array.isArray(ssot.certifications) ? ssot.certifications : []
    ).filter((cert) => cert?.date).length;

    assert.strictEqual(countMatching(fields, /^Career\[c\d+\]\.C_Name$/), expectedCareerCount);
    assert.strictEqual(countMatching(fields, /^License\[c\d+\]\.Lc_Name$/), expectedLicenseCount);
    const expectedAwardCount = Array.isArray(ssot.awards) ? ssot.awards.length : 0;
    assert.strictEqual(
      countMatching(fields, /^Award\[c\d+\]\./),
      expectedAwardCount > 0 ? expectedAwardCount * 5 : 0
    );
  });
});

describe('normalizeCompanyName — Wanted/JobKorea parity (audit P2 fix)', () => {
  it('strips "(주)" prefix to match Wanted career sync normalization', () => {
    assert.strictEqual(normalizeCompanyName('(주)아이티센 CTS'), '아이티센 CTS');
    assert.strictEqual(normalizeCompanyName('아이티센 CTS(주)'), '아이티센 CTS');
  });

  it('returns empty string for null/undefined', () => {
    assert.strictEqual(normalizeCompanyName(null), '');
    assert.strictEqual(normalizeCompanyName(undefined), '');
    assert.strictEqual(normalizeCompanyName(''), '');
  });

  it('passes through company names without "(주)"', () => {
    assert.strictEqual(normalizeCompanyName('Acme Corp'), 'Acme Corp');
    assert.strictEqual(normalizeCompanyName('  spaced  '), 'spaced');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildJobKoreaFormData,
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
import { loadSSOT } from '../ssot-loader.js';

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

  it('toYYYYMM normalizes full dotted date tokens to year-month', () => {
    assert.strictEqual(toYYYYMM('2024.03.15'), '202403');
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
    // M_MainField is empty when no jobkoreaJobCode is provided (no fallback)
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

  it('truncates long myRole to 500 chars', () => {
    const longMyRole = 'a'.repeat(800);
    const fields = mapCareersToFormFields({
      careers: [{ ...baseCareer, myRole: longMyRole }],
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c1].Prfm_Prt').length, 500);
  });



  it('uses per-career jobkoreaJobCode override when provided', () => {
    const fields = mapCareersToFormFields({
      careers: [{ ...baseCareer, jobkoreaJobCode: '1000239' }],
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c1].M_MainField'), '1000239');
  });

  it('uses platformVariants.jobkorea.defaultJobCode when career has no override', () => {
    const fields = mapCareersToFormFields({
      careers: [{ ...baseCareer }],
      platformVariants: { jobkorea: { defaultJobCode: '1000999' } },
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c1].M_MainField'), '1000999');
  });

  it('maps SSoT coverLetter.ko to UserResume.M_Career_Text (headline + paragraphs + closing joined)', () => {
    const fields = mapCareersToFormFields({
      careers: [baseCareer],
      coverLetter: {
        ko: {
          headline: 'OA에서 시작해 자동화로 도착한 8년차',
          paragraphs: ['단락 1.', '단락 2.', '단락 3.'],
          closing: '다음 함께하고 싶습니다.',
        },
      },
    });
    const byName = toMap(fields);
    const careerText = byName.get('UserResume.M_Career_Text');

    assert.ok(careerText.startsWith('OA에서 시작해 자동화로 도착한 8년차'), 'headline at start');
    assert.ok(careerText.includes('단락 1.'), 'first paragraph included');
    assert.ok(careerText.includes('단락 3.'), 'last paragraph included');
    assert.ok(careerText.includes('다음 함께하고 싶습니다.'), 'closing included');
    assert.strictEqual(byName.get('UserResume.M_Career_Text_Stat'), '1');
  });

  it('truncates UserResume.M_Career_Text to 2000 chars', () => {
    const longParagraph = '·'.repeat(800);
    const fields = mapCareersToFormFields({
      careers: [baseCareer],
      coverLetter: {
        ko: {
          headline: 'H',
          paragraphs: [longParagraph, longParagraph, longParagraph, longParagraph],
          closing: 'C',
        },
      },
    });
    const byName = toMap(fields);
    const careerText = byName.get('UserResume.M_Career_Text');

    assert.ok(careerText.length <= 2000, `expected <= 2000, got ${careerText.length}`);
  });

  it('emits empty UserResume.M_Career_Text when SSoT has no coverLetter', () => {
    const fields = mapCareersToFormFields({ careers: [baseCareer] });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UserResume.M_Career_Text'), '');
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
    { name: 'CKS', issuer: 'CNCF', date: null, status: '준비중' },
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
      certifications: [{ name: 'CKS', issuer: 'CNCF', date: null, status: '준비중' }],
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
  it('falls back achievements[] to UserResume.M_Career_Text when no awards[] present', () => {
    const fields = mapAwardToFormFields({ achievements: ['A', 'B'] });
    const byName = toMap(fields);
    assert.ok(byName.has('UserResume.M_Career_Text'), 'should emit fallback field');
    assert.strictEqual(byName.get('UserResume.M_Career_Text_Stat'), '1');
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
  it('exports location codes', () => {
    assert.strictEqual(JK_LOCATION_CODES.서울, 'I000');
    assert.strictEqual(JK_LOCATION_CODES.경기, 'I100');
  });

  it('warns when no jobCodes provided', () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));

    try {
      const fields = mapHopeJobToFormFields({ hope: { roles: ['DevOps'] } });
      const byName = toMap(fields);

      assert.strictEqual(byName.get('HopeJob.HJ_Code'), '10031');
      assert.strictEqual(byName.get('HopeJob.HJ_Name_Code'), '');
      assert.strictEqual(byName.get('HopeJob.HJ_Name'), '');
      assert.strictEqual(warnings.length, 1);
      assert.match(warnings[0], /Unmapped HopeJob roles skipped: DevOps/);
    } finally {
      console.warn = originalWarn;
    }
  });

  it('maps hope roles with explicit jobCodes', () => {
    const fields = mapHopeJobToFormFields({
      hope: { roles: ['시스템 엔지니어', '보안 엔지니어'], jobCodes: ['1000233', '1000238'] },
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

    assert.strictEqual(byName.get('HopeJob.HJ_Name_Code'), '');
    assert.strictEqual(byName.get('HopeJob.HJ_Name'), '');
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


// Verified JobKorea field mappings for previously broad gap categories.
describe('JobKorea gap — skills', () => {
  it('buildJobKoreaFormData includes skill fields from SSoT', () => {
    const ssot = {
      skills: {
        observability: { items: [{ name: 'Prometheus', level: 'Advanced' }] },
      },
      careers: [],
      education: null,
      certifications: [],
      military: null,
      awards: [],
    };
    const fields = buildJobKoreaFormData(ssot, {});
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Skill[c1].Index_Name'), 'c1');
    assert.strictEqual(byName.get('Skill[c1].Skill_Name'), 'Prometheus');
    assert.strictEqual(byName.get('Skill[c1].Skill_Level'), 'Advanced');
    assert.strictEqual(byName.get('Skill.index'), 'c1');
    assert.strictEqual(byName.get('InputStat.SkillInputStat'), 'True');
  });
});

describe('JobKorea gap — languages', () => {
  it('buildJobKoreaFormData includes language fields from SSoT', () => {
    const ssot = {
      languages: [{ name: 'English', level: '비즈니스 회화가능' }],
      careers: [],
      education: null,
      certifications: [],
      military: null,
      awards: [],
    };
    const fields = buildJobKoreaFormData(ssot, {});
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Language[c1].Index_Name'), 'c1');
    assert.strictEqual(byName.get('Language[c1].Lang_Name'), 'English');
    assert.strictEqual(byName.get('Language[c1].Lang_Level'), '비즈니스 회화가능');
    assert.strictEqual(byName.get('Language.index'), 'c1');
    assert.strictEqual(byName.get('InputStat.LanguageInputStat'), 'True');
  });
});

describe('JobKorea gap — personal fields', () => {
  it('buildJobKoreaFormData includes birthDate, address, and github', () => {
    const ssot = {
      personal: {
        birthDate: '1994-05-07',
        address: 'Seoul',
        github: 'https://github.com/jclee941',
      },
      careers: [],
      education: null,
      certifications: [],
      military: null,
      awards: [],
    };
    const fields = buildJobKoreaFormData(ssot, {});
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UserResume.Birth_YMD'), '19940507');
    assert.strictEqual(byName.get('UserResume.Address'), 'Seoul');
    assert.strictEqual(byName.get('UserResume.GitHub'), 'https://github.com/jclee941');
  });
});

describe('JobKorea gap — hope salary and industries', () => {
  it('mapHopeJobToFormFields maps hope salary', () => {
    const fields = mapHopeJobToFormFields({
      hope: { roles: ['보안 엔지니어'], salary: '5000만원 이상' },
    });
    const byName = toMap(fields);
    assert.strictEqual(byName.get('HopeJob.HJ_Salary'), '5000만원 이상');
  });

  it('mapHopeJobToFormFields maps hope industries', () => {
    const fields = mapHopeJobToFormFields({
      hope: { roles: ['보안 엔지니어'], industries: ['금융', '보안'] },
    });
    const byName = toMap(fields);
    assert.strictEqual(byName.get('HopeJob.HJ_Industry'), '금융,보안');
  });
});

describe('JobKorea gap — career projects and metadata', () => {
  it('mapCareersToFormFields maps sub-projects under careers', () => {
    const fields = mapCareersToFormFields({
      careers: [
        {
          company: 'Test',
          period: '2024.01 ~ 2024.06',
          role: 'DevOps',
          projects: [
            { name: 'Proj A', description: 'Desc A', achievements: ['A1'] },
          ],
        },
      ],
    });
    const byName = toMap(fields);
    assert.strictEqual(byName.get('Career[c1].Project[p1].P_Name'), 'Proj A');
    assert.strictEqual(byName.get('Career[c1].Project[p1].P_Cntnt'), 'Desc A');
  });

  it('mapCareersToFormFields maps career metadata fields', () => {
    const fields = mapCareersToFormFields({
      careers: [
        {
          company: 'Test',
          period: '2024.01 ~ 2024.06',
          role: 'DevOps',
          client: 'ClientA',
          teamSize: 5,
          myRole: 'Lead',
          workType: '정규직',
        },
      ],
    });
    const byName = toMap(fields);
    assert.strictEqual(byName.get('Career[c1].C_Client'), 'ClientA');
    assert.strictEqual(byName.get('Career[c1].C_TeamSize'), '5');
    assert.strictEqual(byName.get('Career[c1].C_MyRole'), 'Lead');
    assert.strictEqual(byName.get('Career[c1].C_WorkType'), '정규직');
  });
});

describe('JobKorea gap — certification extra fields', () => {
  it('mapLicensesToFormFields maps expirationDate, credentialId, credentialUrl, status, note', () => {
    const fields = mapLicensesToFormFields({
      certifications: [
        {
          name: 'AWS SAA',
          issuer: 'AWS',
          date: '2024.01',
          expirationDate: '2027.01',
          credentialId: 'ABC123',
          credentialUrl: 'https://aws.amazon.com/cert',
          status: 'active',
          note: 'Note',
        },
      ],
    });
    const byName = toMap(fields);
    assert.strictEqual(byName.get('License[c1].Lc_Exp'), '202701');
    assert.strictEqual(byName.get('License[c1].Lc_CredId'), 'ABC123');
    assert.strictEqual(byName.get('License[c1].Lc_CredUrl'), 'https://aws.amazon.com/cert');
    assert.strictEqual(byName.get('License[c1].Lc_Status'), 'active');
    assert.strictEqual(byName.get('License[c1].Lc_Note'), 'Note');
  });
});

describe('JobKorea gap — high school', () => {
  it('buildJobKoreaFormData includes high school when ssot.highSchool is present', () => {
    const ssot = {
      highSchool: {
        school: '용남고',
        startDate: '2010.03',
        endDate: '2013.02',
        status: '졸업',
      },
      careers: [],
      education: null,
      certifications: [],
      military: null,
      awards: [],
    };
    const fields = buildJobKoreaFormData(ssot, {});
    const byName = toMap(fields);

    assert.strictEqual(byName.get('HighSchool[c1].Schl_Name'), '용남고');
    assert.strictEqual(byName.get('HighSchool[c1].Entc_YM'), '201003');
    assert.strictEqual(byName.get('HighSchool[c1].Grad_YM'), '201302');
    assert.strictEqual(byName.get('HighSchool[c1].Grad_Type_Code'), '10');
    assert.strictEqual(byName.get('HighSchool.index'), 'c1');
    assert.strictEqual(byName.get('InputStat.HighSchoolInputStat'), 'True');
  });
});

describe('JobKorea gap — awards achievements fallback', () => {
  it('mapAwardToFormFields falls back achievements to a bounded text field', () => {
    const fields = mapAwardToFormFields({
      achievements: ['Achievement A', 'Achievement B'],
    });
    const byName = toMap(fields);
    assert.ok(fields.length > 0, 'should emit fallback fields for achievements');
    assert.strictEqual(
      byName.get('UserResume.M_Career_Text'),
      '- Achievement A\n- Achievement B'
    );
    assert.strictEqual(byName.get('UserResume.M_Career_Text_Stat'), '1');
  });
});

describe('JobKorea gap — personal projects', () => {
  it('buildJobKoreaFormData includes personal project fields', () => {
    const ssot = {
      personalProjects: [
        {
          name: 'Proj A',
          description: 'Desc A',
          url: 'https://example.com',
        },
      ],
      careers: [],
      education: null,
      certifications: [],
      military: null,
      awards: [],
    };
    const fields = buildJobKoreaFormData(ssot, {});
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Project[c1].Index_Name'), 'c1');
    assert.strictEqual(byName.get('Project[c1].P_Name'), 'Proj A');
    assert.strictEqual(byName.get('Project[c1].P_Cntnt'), 'Desc A');
    assert.strictEqual(byName.get('Project[c1].P_Url'), 'https://example.com');
    assert.strictEqual(byName.get('Project.index'), 'c1');
    assert.strictEqual(byName.get('InputStat.ProjectInputStat'), 'True');
  });
});

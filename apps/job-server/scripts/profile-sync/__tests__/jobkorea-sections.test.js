import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildJobKoreaFormData,
  JK_LOCATION_CODES,
  JOBKOREA_RESUME_TITLE,
  mapAwardToFormFields,
  mapCareersToFormFields,
  normalizeCompanyName,
  mapHopeJobToFormFields,
  mapIntroToFormFields,
  mapLicensesToFormFields,
  mapMilitaryToFormFields,
  mapPersonalFieldsToFormFields,
  mapPersonalProjectsToFormFields,
  mapPortfolioToFormFields,
  mapResumeTitleToFormFields,
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

function valuesForName(fields, name) {
  return fields
    .filter((field) => field.name === name)
    .map((field) => String(field.value ?? ''));
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

  it('normalizes platform-facing role and work type values', () => {
    const fields = mapCareersToFormFields({
      careers: [
        {
          ...baseCareer,
          role: '보안운영 담당',
          workType: '정규직 (파견)',
        },
      ],
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c1].M_MainJob_Jikwi'), '보안 운영');
    assert.strictEqual(byName.get('Career[c1].C_WorkType'), '정규직');
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

  it('emits retirement reason for resigned careers from platform default', () => {
    const fields = mapCareersToFormFields({
      careers: [baseCareer],
      platformVariants: {
        jobkorea: { defaultRetireReasonCode: '5', defaultRetireReason: '계약기간 만료' },
      },
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c1].RetireSt'), '2');
    assert.strictEqual(byName.get('Career[c1].Retire_Rsn_Code'), '5');
    assert.strictEqual(byName.get('Career[c1].Retire_Rsn'), '계약기간 만료');
  });

  it('prefers per-career retire reason override', () => {
    const fields = mapCareersToFormFields({
      careers: [{ ...baseCareer, jobkoreaRetireReasonCode: '3', jobkoreaRetireReason: '자발적 이직' }],
      platformVariants: {
        jobkorea: { defaultRetireReasonCode: '5', defaultRetireReason: '계약기간 만료' },
      },
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c1].Retire_Rsn_Code'), '3');
    assert.strictEqual(byName.get('Career[c1].Retire_Rsn'), '자발적 이직');
  });

  it('leaves retirement reason empty for 현재 (current) careers', () => {
    const fields = mapCareersToFormFields({
      careers: [{ ...baseCareer, period: '2024.03 ~ 현재' }],
      platformVariants: {
        jobkorea: { defaultRetireReasonCode: '5', defaultRetireReason: '계약기간 만료' },
      },
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Career[c1].RetireSt'), '1');
    assert.strictEqual(byName.get('Career[c1].Retire_Rsn_Code'), '');
    assert.strictEqual(byName.get('Career[c1].Retire_Rsn'), '');
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

  it('maps SSoT careerSummary.ko to UserResume.M_Career_Text without using coverLetter.ko', () => {
    const fields = mapCareersToFormFields({
      careers: [baseCareer],
      coverLetter: {
        ko: {
          headline: '자기소개서 헤드라인',
          paragraphs: ['자기소개서 단락 1.', '자기소개서 단락 2.'],
          closing: '자기소개서 마무리.',
        },
      },
      careerSummary: {
        ko: {
          headline: '경력기술서 헤드라인',
          paragraphs: ['경력기술서 단락 1.', '경력기술서 단락 2.', '경력기술서 단락 3.'],
          closing: '경력기술서 마무리.',
        },
      },
    });
    const byName = toMap(fields);
    const careerText = byName.get('UserResume.M_Career_Text');

    assert.ok(careerText.startsWith('경력기술서 헤드라인'), 'careerSummary headline at start');
    assert.ok(careerText.includes('경력기술서 단락 1.'), 'careerSummary first paragraph included');
    assert.ok(careerText.includes('경력기술서 단락 3.'), 'careerSummary last paragraph included');
    assert.ok(careerText.includes('경력기술서 마무리.'), 'careerSummary closing included');
    assert.ok(!careerText.includes('자기소개서 헤드라인'), 'coverLetter headline excluded');
    assert.ok(!careerText.includes('자기소개서 단락'), 'coverLetter paragraphs excluded');
    assert.strictEqual(byName.get('UserResume.M_Career_Text_Stat'), '1');
  });

  it('truncates UserResume.M_Career_Text to 2000 chars', () => {
    const longParagraph = '·'.repeat(800);
    const fields = mapCareersToFormFields({
      careers: [baseCareer],
      careerSummary: {
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

  it('keeps real JobKorea career statement factual and inside the field limit', () => {
    const ssot = loadSSOT();
    const fields = mapCareersToFormFields(ssot);
    const byName = toMap(fields);
    const careerText = byName.get('UserResume.M_Career_Text');

    assert.ok(careerText.length <= 2000, `expected <= 2000, got ${careerText.length}`);
    for (const phrase of [
      'AI 에이전트',
      '반복 작업',
      '자동화',
      'OA에서 시작',
      '도착한',
      '기여하고자',
    ]) {
      assert.ok(!careerText.includes(phrase), `career statement still contains "${phrase}"`);
    }
  });

  it('keeps real SSoT career role labels plain for job platform sync', () => {
    const ssot = loadSSOT();
    const expectedRoles = {
      'itcen-cts': '보안 인프라 엔지니어',
      'gaonnuri-information-system': '보안 인프라 엔지니어',
      'quantec-investment': '정보보안 담당자',
      jointree: '네트워크 보안 엔지니어',
      'metanet-mplatform': '인프라 운영 엔지니어',
      mtdata: 'IT/OA 운영 엔지니어',
    };

    for (const [id, expectedRole] of Object.entries(expectedRoles)) {
      const career = ssot.careers.find((item) => item.id === id);
      assert.ok(career, `missing career ${id}`);
      assert.strictEqual(career.role, expectedRole);
      assert.ok(!/[()]/.test(career.role), `${id} role still has parentheses`);
    }
  });

  it('maps Nextrade career work type to freelancer in JobKorea form fields', () => {
    const ssot = loadSSOT();
    const fields = mapCareersToFormFields(ssot);
    const byName = toMap(fields);
    const nextradeCareers = ssot.careers
      .map((career, index) => ({ career, index }))
      .filter(({ career }) => ['itcen-cts', 'gaonnuri-information-system'].includes(career.id));

    assert.strictEqual(nextradeCareers.length, 2);
    for (const { career, index } of nextradeCareers) {
      assert.strictEqual(career.workType, '프리랜서');
      assert.strictEqual(byName.get(`Career[c${index + 1}].C_WorkType`), '프리랜서');
      assert.ok(!career.note.includes('프리랜서 계약'));
      assert.ok(!career.note.includes('정규직'));
      assert.ok(!career.note.includes('파견'));
    }
  });

  it('emits empty UserResume.M_Career_Text when SSoT has no careerSummary', () => {
    const fields = mapCareersToFormFields({ careers: [baseCareer] });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UserResume.M_Career_Text'), '');
  });
});

describe('mapResumeTitleToFormFields', () => {
  it('sets the stable JobKorea resume title', () => {
    const fields = mapResumeTitleToFormFields();
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UserResume.M_Resume_Title'), JOBKOREA_RESUME_TITLE);
    assert.strictEqual(JOBKOREA_RESUME_TITLE, '이재철 - 정보보안 엔지니어');
  });

  it('prefers platformVariants.jobkorea.headline when present', () => {
    const fields = mapResumeTitleToFormFields({
      platformVariants: { jobkorea: { headline: 'JobKorea 전용 제목' } },
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UserResume.M_Resume_Title'), 'JobKorea 전용 제목');
  });
});

describe('mapIntroToFormFields', () => {
  it('maps SSoT coverLetter.ko into ResumeProfile fields', () => {
    const fields = mapIntroToFormFields(
      {
        coverLetter: {
          ko: {
            headline: '반복 작업의 한계에서 출발해 자동화로 답한 보안 엔지니어',
            paragraphs: ['자기소개서 단락 1.', '자기소개서 단락 2.'],
            closing: '자기소개서 마무리.',
          },
        },
      },
      ['c1306']
    );
    const byName = toMap(fields);

    assert.strictEqual(byName.get('ResumeProfile.Index'), 'c1306');
    assert.strictEqual(
      byName.get('ResumeProfile[c1306].Header'),
      '반복 작업의 한계에서 출발해 자동화로 답한 보안 엔지니어'.slice(0, 50)
    );
    assert.strictEqual(
      byName.get('ResumeProfile[c1306].Contents'),
      '자기소개서 단락 1.\n\n자기소개서 단락 2.\n\n자기소개서 마무리.'
    );
    assert.strictEqual(byName.get('InputStat.UserIntroduceInputStat'), 'True');
  });

  it('truncates intro title and contents to JobKorea limits', () => {
    const fields = mapIntroToFormFields({
      coverLetter: {
        ko: {
          headline: '가'.repeat(80),
          paragraphs: ['나'.repeat(2500)],
          closing: '다'.repeat(20),
        },
      },
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('ResumeProfile[c1].Header').length, 50);
    assert.strictEqual(byName.get('ResumeProfile[c1].Contents').length, 2000);
  });

  it('prefers platformVariants.jobkorea.about for intro contents and keeps JobKorea limits', () => {
    const fields = mapIntroToFormFields(
      {
        platformVariants: {
          jobkorea: {
            headline: 'JobKorea 전용 자기소개 제목',
            about: 'JobKorea 전용 자기소개 본문',
          },
        },
        coverLetter: {
          ko: {
            headline: '일반 자기소개 제목',
            paragraphs: ['일반 자기소개 본문'],
            closing: '',
          },
        },
      },
      ['c1306']
    );
    const byName = toMap(fields);

    assert.strictEqual(byName.get('ResumeProfile[c1306].Header'), 'JobKorea 전용 자기소개 제목');
    assert.strictEqual(byName.get('ResumeProfile[c1306].Contents'), 'JobKorea 전용 자기소개 본문');
    assert.ok(byName.get('ResumeProfile[c1306].Header').length <= 50);
    assert.ok(byName.get('ResumeProfile[c1306].Contents').length <= 2000);
  });

  it('keeps real JobKorea platform copy inside mapped field limits', () => {
    const ssot = loadSSOT();
    const fields = mapIntroToFormFields(ssot, ['c1']);
    const byName = toMap(fields);
    const header = byName.get('ResumeProfile[c1].Header');
    const contents = byName.get('ResumeProfile[c1].Contents');

    assert.ok(header.length <= 50);
    assert.ok(contents.length <= 2000);
    assert.strictEqual(contents, ssot.platformVariants.jobkorea.about);
    for (const phrase of ['자동화', 'AI 에이전트']) {
      assert.ok(!header.includes(phrase), `JobKorea intro header still contains "${phrase}"`);
      assert.ok(!contents.includes(phrase), `JobKorea intro contents still contain "${phrase}"`);
    }
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
      education: {
        school: '테스트대',
        major: '전산',
        startDate: '2020.03',
        status: '재학중',
        schoolType: '4년제',
        majorType: '전공',
      },
    });
    const byName = toMap(fields);
    assert.strictEqual(byName.get('UnivSchool[c1].Schl_Type_Code'), '2');
    assert.strictEqual(byName.get('UnivSchool[c1].UnivMajor[0].Major_Type_Code'), '1');
  });

  it('BUG-J1: maps EN locale aliases (4-year → 2, Major → 1)', () => {
    const fields = mapSchoolToFormFields({
      education: {
        school: 'Test U',
        major: 'CS',
        startDate: '2020.03',
        status: '재학중',
        schoolType: '4-year',
        majorType: 'Major',
      },
    });
    const byName = toMap(fields);
    assert.strictEqual(byName.get('UnivSchool[c1].Schl_Type_Code'), '2');
    assert.strictEqual(byName.get('UnivSchool[c1].UnivMajor[0].Major_Type_Code'), '1');
  });

  it('BUG-J1: maps JA locale aliases (4年制 → 2, 専攻 → 1)', () => {
    const fields = mapSchoolToFormFields({
      education: {
        school: 'テスト大',
        major: 'CS',
        startDate: '2020.03',
        status: '재학중',
        schoolType: '4年制',
        majorType: '専攻',
      },
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
      education: {
        school: '용남고',
        startDate: '2010.03',
        endDate: '2013.02',
        status: '졸업',
        schoolType: '고등학교',
      },
    });
    const grad = mapSchoolToFormFields({
      education: {
        school: '대학원',
        startDate: '2018.03',
        endDate: '2020.02',
        status: '졸업',
        schoolType: '대학원',
      },
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

    assert.deepStrictEqual(valuesForName(fields, 'License.index'), ['c1', 'c2']);
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
  it('uses JobKorea timestamp-based Award indices from the live DOM', () => {
    const fields = mapAwardToFormFields(
      {
        awards: [
          { name: '우수상', organization: '한양사이버대학교', year: '2026' },
          { name: '공로상', organization: '테스트기관', year: '2025' },
        ],
      },
      ['1_1778240625462', '2_1778240625463']
    );
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Award[1_1778240625462].Award_Name'), '우수상');
    assert.strictEqual(byName.get('Award[2_1778240625463].Award_Name'), '공로상');
    assert.strictEqual(byName.get('Award.index'), '1_1778240625462,2_1778240625463');
    assert.ok(!byName.has('Award[c1].Award_Name'));
    assert.ok(!byName.has('Award[c2].Award_Name'));
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
    hope: {
      roles: ['보안 엔지니어'],
      jobCodes: ['1000238'],
      salary: '5000만원 이상',
      industries: ['금융', '보안'],
    },
    skills: {
      observability: { items: [{ name: 'Prometheus', level: 'Advanced' }] },
    },
    personalProjects: [{ name: 'Proj A', description: 'Desc A', url: 'https://example.com' }],
  };

  it('combines all SSoT-backed JobKorea form sections into one field array', () => {
    const fields = buildJobKoreaFormData(fullSSOT, {});
    const names = fields.map((field) => field.name);

    assert.ok(names.some((name) => name.startsWith('Career[')));
    assert.ok(names.some((name) => name.startsWith('UnivSchool[')));
    assert.ok(names.some((name) => name.startsWith('License[')));
    assert.ok(names.some((name) => name.startsWith('UserAddition.')));
    assert.ok(names.some((name) => name.startsWith('Award[')));
    assert.ok(names.some((name) => name.startsWith('HopeJob.')));
    assert.ok(names.some((name) => name.startsWith('Skill[')));
    assert.ok(names.some((name) => name.startsWith('Project[')));
    assert.ok(!names.some((name) => name.startsWith('HighSchool[')));
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

  it('includes optional SSoT-backed sections with available mappers', () => {
    const ssot = {
      ...fullSSOT,
      highSchool: {
        school: '용남고',
        startDate: '2010.03',
        endDate: '2013.02',
        status: '졸업',
      },
      hope: {
        roles: ['보안 엔지니어'],
        jobCodes: ['1000238'],
        salary: '5000만원 이상',
        industries: ['금융', '보안'],
      },
      skills: {
        observability: { items: [{ name: 'Prometheus', level: 'Advanced' }] },
      },
      personalProjects: [
        {
          name: 'Proj A',
          description: 'Desc A',
          url: 'https://example.com',
        },
      ],
    };

    const fields = buildJobKoreaFormData(ssot, {
      career: ['c6'],
      school: 'c2',
      license: ['c18'],
      award: ['1_1778240625462'],
      language: ['c532'],
    });
    const names = fields.map((field) => field.name);

    assert.ok(names.some((name) => name.startsWith('HighSchool.')));
    assert.ok(names.some((name) => name === 'HighSchool.index'));
    assert.ok(names.some((name) => name === 'InputStat.HighSchoolInputStat'));
    assert.ok(names.some((name) => name.startsWith('HopeJob.')));
    assert.ok(names.some((name) => name === 'InputStat.HopeJobInputStat'));
    assert.ok(names.some((name) => name.startsWith('Skill[')));
    assert.ok(names.some((name) => name === 'Skill.index'));
    assert.ok(names.some((name) => name === 'InputStat.SkillInputStat'));
    assert.ok(names.some((name) => name.startsWith('Project[')));
    assert.ok(names.some((name) => name === 'Project.index'));
    assert.ok(names.some((name) => name === 'InputStat.ProjectInputStat'));
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

describe('JobKorea SSoT field-mapping correctness — RED', () => {
  it('B1 buildJobKoreaFormData normalizes real dotted birth date to 8 digits', () => {
    const ssot = loadSSOT();
    const byName = toMap(buildJobKoreaFormData(ssot, {}));

    assert.strictEqual(byName.get('UserResume.Birth_YMD'), '19941017');
  });

  it('B1 mapPersonalFieldsToFormFields normalizes dotted birth date to 8 digits', () => {
    const fields = mapPersonalFieldsToFormFields({ personal: { birthDate: '1994.10.17' } });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('UserResume.Birth_YMD'), '19941017');
  });

  it('B2 buildJobKoreaFormData includes real SSoT skills', () => {
    const ssot = loadSSOT();
    const fields = buildJobKoreaFormData(ssot, {});

    assert.ok(
      fields.some((field) => /^Skill\[c\d+\]\.Skill_Name$/.test(field.name)),
      `expected Skill[cN].Skill_Name fields for ${Object.values(ssot.skills ?? {}).flatMap((group) => group.items ?? []).length} SSoT skills`
    );
  });

  it('B2 buildJobKoreaFormData includes real SSoT hope job fields', () => {
    const ssot = loadSSOT();
    const fields = buildJobKoreaFormData(ssot, {});

    assert.ok(
      fields.some((field) => /^HopeJob\.HJ_/.test(field.name)),
      'expected HopeJob.HJ_* fields'
    );
  });

  it('B2 buildJobKoreaFormData includes real SSoT personal projects', () => {
    const ssot = loadSSOT();
    const fields = buildJobKoreaFormData(ssot, {});

    assert.ok(
      fields.some((field) => /^Project\[c\d+\]\.P_Name$/.test(field.name)),
      `expected Project[cN].P_Name fields for ${ssot.personalProjects?.length ?? 0} personal projects`
    );
  });

  it('B3/B4 mapPersonalProjectsToFormFields maps githubUrl to P_Url', () => {
    const fields = mapPersonalProjectsToFormFields({
      personalProjects: [
        {
          name: 'Project X',
          description: 'Project X description',
          githubUrl: 'https://github.com/x',
        },
      ],
    });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Project[c1].P_Url'), 'https://github.com/x');
  });

  it('B3 buildJobKoreaFormData maps real education.highSchool to HighSchool Schl_Name', () => {
    const ssot = loadSSOT();
    const byName = toMap(buildJobKoreaFormData(ssot, {}));

    assert.strictEqual(byName.get('HighSchool.Schl_Name'), ssot.education.highSchool);
  });

  it('B5 mapCareersToFormFields emits Career[c1].CNameHold exactly once', () => {
    const ssot = loadSSOT();
    const fields = mapCareersToFormFields({ careers: [ssot.careers[0]] });
    const count = fields.filter((field) => field.name === 'Career[c1].CNameHold').length;

    assert.strictEqual(count, 1);
  });

  it('B6 buildJobKoreaFormData falls back M_Career_Text to careerSummary.ko when coverLetter.ko is absent', () => {
    const fields = buildJobKoreaFormData({
      careers: [
        { company: 'Test', period: '2024.01 ~ 현재', role: 'Security', description: 'desc' },
      ],
      careerSummary: {
        ko: {
          headline: '경력 요약 헤드라인',
          paragraphs: ['경력 요약 본문'],
          closing: '경력 요약 마무리',
        },
      },
    });
    const byName = toMap(fields);

    assert.ok(byName.get('UserResume.M_Career_Text')?.includes('경력 요약 헤드라인'));
  });

  it('COMPLETENESS real SSoT maps non-empty required fields for every career', () => {
    const ssot = loadSSOT();
    const fields = buildJobKoreaFormData(ssot, {});
    const byName = toMap(fields);

    ssot.careers.forEach((_, index) => {
      const careerIndex = `c${index + 1}`;
      for (const suffix of ['C_Name', 'CSYM', 'RetireSt', 'M_MainJob_Jikwi', 'Prfm_Prt']) {
        const fieldName = `Career[${careerIndex}].${suffix}`;
        assert.notStrictEqual(byName.get(fieldName), '', `${fieldName} should be non-empty`);
      }
    });
    assert.notStrictEqual(
      byName.get('UserResume.M_Career_Text'),
      '',
      'UserResume.M_Career_Text should be non-empty'
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

describe('JobKorea live form — skills', () => {
  it('buildJobKoreaFormData includes skill fields from SSoT skills', () => {
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
    const names = fields.map((field) => field.name);

    assert.ok(names.some((name) => name.startsWith('Skill[')));
    assert.ok(names.includes('Skill.index'));
    assert.ok(names.includes('InputStat.SkillInputStat'));
  });
});

describe('JobKorea live form — languages', () => {
  it('buildJobKoreaFormData maps language names to Lang1_Name using live DOM indices', () => {
    const ssot = {
      languages: [{ name: 'English', level: '비즈니스 회화가능' }],
      careers: [],
      education: null,
      certifications: [],
      military: null,
      awards: [],
    };
    const fields = buildJobKoreaFormData(ssot, { language: ['c532'] });
    const byName = toMap(fields);

    assert.strictEqual(byName.get('Language[c532].Index_Name'), 'c532');
    assert.strictEqual(byName.get('Language[c532].Lang1_Name'), 'English');
    assert.strictEqual(byName.get('Language.index'), 'c532');
    assert.strictEqual(byName.get('InputStat.LanguageInputStat'), 'True');
    assert.ok(!byName.has('Language[c532].Lang_Name'));
    assert.ok(!byName.has('Language[c532].Lang_Level'));
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
          projects: [{ name: 'Proj A', description: 'Desc A', achievements: ['A1'] }],
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

describe('JobKorea live form — high school', () => {
  it('buildJobKoreaFormData includes high school from legacy ssot.highSchool object', () => {
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
    const names = fields.map((field) => field.name);

    assert.equal(fields.find((f) => f.name === 'HighSchool.Schl_Name')?.value, '용남고');
    assert.ok(names.includes('HighSchool.index'));
    assert.ok(names.includes('InputStat.HighSchoolInputStat'));
  });
});

describe('JobKorea gap — awards achievements fallback', () => {
  it('mapAwardToFormFields falls back achievements to a bounded text field', () => {
    const fields = mapAwardToFormFields({
      achievements: ['Achievement A', 'Achievement B'],
    });
    const byName = toMap(fields);
    assert.ok(fields.length > 0, 'should emit fallback fields for achievements');
    assert.strictEqual(byName.get('UserResume.M_Career_Text'), '- Achievement A\n- Achievement B');
    assert.strictEqual(byName.get('UserResume.M_Career_Text_Stat'), '1');
  });
});

describe('JobKorea live form — personal projects', () => {
  it('buildJobKoreaFormData includes personal project fields from SSoT personalProjects', () => {
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
    const names = fields.map((field) => field.name);

    assert.ok(names.some((name) => name.startsWith('Project[')));
    assert.ok(names.includes('Project.index'));
    assert.ok(names.includes('InputStat.ProjectInputStat'));
  });
});

export const JK_JOB_CODES = {
  보안엔지니어: 1000238,
  '보안운영 담당': 1000238,
  '보안 구축 담당': 1000238,
  정보보호팀: 1000238,
  보안구축담당: 1000238,
  시스템엔지니어: 1000233,
  '시스템 엔지니어': 1000233,
  '인프라 담당': 1000233,
  'IT지원/OA운영': 1000233,
};

export const JK_JOB_CATEGORY = 10031;

export const GRAD_TYPE = {
  졸업: 10,
  졸업예정: 5,
  재학중: 4,
  중퇴: 2,
  수료: 9,
  휴학: 3,
};

export const MILITARY_STAT = {
  군필: 4,
  미필: 2,
  면제: 1,
  해당없음: 5,
  사회복무요원: 4,
};

export const MILITARY_KIND = {
  육군: 1,
  해군: 2,
  공군: 3,
  해병: 4,
  전경: 5,
  의경: 6,
  공익: 7,
  기타: 8,
};

export const SCHOOL_TYPE = {
  '4년제': 2,
  '2년제': 5,
  고등학교: 11,
};

export function toYYYYMM(dateStr) {
  if (!dateStr) return '';
  return String(dateStr).replace(/\./g, '').trim();
}

function toFieldValue(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function pushField(fields, name, value) {
  fields.push({ name, value: toFieldValue(value) });
}

export function parseRange(period) {
  const raw = String(period || '');
  // Support both '~' and ' - ' separators
  const parts = raw.includes('~')
    ? raw.split('~').map((part) => part.trim())
    : raw.split(' - ').map((part) => part.trim());
  const start = toYYYYMM(parts[0] || '');
  const rawEnd = parts[1] || '';
  const isCurrent = rawEnd.includes('현재');
  const end = isCurrent ? '' : toYYYYMM(rawEnd);
  return { start, end, isCurrent };
}

function militaryKindToCode(kind) {
  if (kind === '사회복무요원') return 7;
  return MILITARY_KIND[kind] || 8;
}

/**
 * Map careers to JobKorea form fields.
 * @param {object} ssot - SSOT resume data
 * @param {string[]} [indices] - Server-generated entry indices (e.g. ['c14','c844','c845']).
 *   When provided, these replace the default c1-cN indices so the server accepts the data.
 */
export function mapCareersToFormFields(ssot, indices) {
  const careers = Array.isArray(ssot?.careers) ? ssot.careers : [];
  if (careers.length === 0) return [];

  const fields = [];
  const keys =
    indices && indices.length >= careers.length ? indices : careers.map((_, i) => `c${i + 1}`);

  careers.forEach((career, idx) => {
    if (idx >= keys.length) return;
    const key = keys[idx];
    const { start, end, isCurrent } = parseRange(career?.period || '');
    const code = JK_JOB_CODES[career?.role] || 1000233;

    pushField(fields, `Career[${key}].Index_Name`, key);
    pushField(fields, `Career[${key}].C_Name`, career?.company || '');
    pushField(fields, `Career[${key}].Co_Code`, '');
    pushField(fields, `Career[${key}].CName_Code`, '');
    pushField(fields, `Career[${key}].M_MainCate`, '');
    pushField(fields, `Career[${key}].Retire_Rsn_Code`, '');
    pushField(fields, `Career[${key}].Retire_Rsn`, '');
    pushField(fields, `Career[${key}].Biz_No`, '');
    pushField(fields, `Career[${key}].NHIS_LINKED_STAT`, '');
    pushField(fields, `Career[${key}].C_Part`, career?.department || '');
    pushField(fields, `Career[${key}].CSYM`, start);
    pushField(fields, `Career[${key}].CEYM`, end);
    pushField(fields, `Career[${key}].RetireSt`, isCurrent ? 1 : 2);
    pushField(fields, `Career[${key}].M_MainJob_Jikwi`, career?.role || '');
    pushField(fields, `Career[${key}].Job_Type_Code`, '');
    pushField(fields, `Career[${key}].M_MainField`, '');  // Empty: prevents code number display in resume
    pushField(fields, `Career[${key}].M_MainJob`, '');     // Empty: same reason
    pushField(fields, `Career[${key}].Job_Field_Direct`, '');  // Must be empty, not code
    pushField(fields, `Career[${key}].M_MainPay_User`, '');
    pushField(fields, `Career[${key}].Prfm_Prt`, String(career?.description || '').slice(0, 500));
    pushField(fields, `Career[${key}].CNameHold`, '0');
    pushField(fields, `Career[${key}].OpenStat`, '1');
  });

  pushField(fields, 'Career.index', keys.slice(0, careers.length).join(','));
  pushField(fields, 'UserResume.M_Career_Text', '');
  pushField(fields, 'UserResume.M_Career_Text_Stat', '1');
  pushField(fields, 'InputStat.CareerInputStat', 'True');
  return fields;
}

/**
 * Map school/education to JobKorea form fields.
 * @param {object} ssot - SSOT resume data
 * @param {string} [schoolIndex] - Server-generated school entry index (e.g. 'c10').
 */
export function mapSchoolToFormFields(ssot, schoolIndex) {
  const education = ssot?.education;
  if (!education) return [];

  const key = schoolIndex || 'c1';
  const isEnrolled = education.status === '재학중';
  // Server requires Grad_YM even for 재학중 — use endDate or estimated graduation
  let gradYM;
  if (isEnrolled) {
    // Estimate: startDate + 4 years (typical Korean 4-year degree)
    const startRaw = toYYYYMM(education.startDate || '');
    if (startRaw.length >= 4) {
      const startYear = parseInt(startRaw.slice(0, 4), 10);
      gradYM = `${startYear + 4}02`; // February graduation
    } else {
      gradYM = '';
    }
  } else {
    gradYM = toYYYYMM(education.endDate || '');
  }
  const gradTypeCode = GRAD_TYPE[education.status] || GRAD_TYPE.재학중;

  return [
    { name: `UnivSchool[${key}].Schl_Name`, value: toFieldValue(education.school || '') },
    { name: `UnivSchool[${key}].Schl_Type_Code`, value: toFieldValue(SCHOOL_TYPE['4년제']) },
    {
      name: `UnivSchool[${key}].Entc_YM`,
      value: toFieldValue(toYYYYMM(education.startDate || '')),
    },
    { name: `UnivSchool[${key}].Grad_YM`, value: toFieldValue(gradYM) },
    { name: `UnivSchool[${key}].Grad_Type_Code`, value: toFieldValue(gradTypeCode) },
    {
      name: `UnivSchool[${key}].UnivMajor[0].Major_Name`,
      value: toFieldValue(education.major || ''),
    },
    { name: `UnivSchool[${key}].UnivMajor[0].Major_Type_Code`, value: '1' },
    { name: 'UnivSchool.index', value: key },
    { name: 'InputStat.SchoolInputStat', value: 'True' },
  ];
}

/**
 * Map certifications to JobKorea form fields.
 * @param {object} ssot - SSOT resume data
 * @param {string[]} [indices] - Server-generated entry indices.
 */
export function mapLicensesToFormFields(ssot, indices) {
  const certifications = Array.isArray(ssot?.certifications) ? ssot.certifications : [];
  // Filter out certs without a date (status: 준비중)
  const validCerts = certifications.filter((cert) => cert?.date);
  if (validCerts.length === 0) return [];

  const fields = [];
  const keys =
    indices && indices.length >= validCerts.length
      ? indices
      : validCerts.map((_, i) => `c${i + 1}`);

  validCerts.forEach((cert, idx) => {
    if (idx >= keys.length) return;
    const key = keys[idx];
    pushField(fields, `License[${key}].Index_Name`, key);
    pushField(fields, `License[${key}].Naver_Lcns_Linked_Stat`, '');
    pushField(fields, `License[${key}].Lc_Name`, cert?.name || '');
    pushField(fields, `License[${key}].Lc_Code`, '');
    pushField(fields, `License[${key}].Lc_Pub`, cert?.issuer || '');
    pushField(fields, `License[${key}].Lc_YYMM`, toYYYYMM(cert?.date || ''));
  });

  pushField(fields, 'License.index', keys.slice(0, validCerts.length).join(','));
  pushField(fields, 'InputStat.LicenseInputStat', 'True');
  return fields;
}

export function mapMilitaryToFormFields(ssot) {
  const military = ssot?.military;
  if (!military) return [];

  const { start, end } = parseRange(military.period || '');
  const statCode = MILITARY_STAT[military.status] || MILITARY_STAT.해당없음;
  const kindCode = militaryKindToCode(military.status);

  return [
    { name: 'UserAddition.Military_Stat', value: toFieldValue(statCode) },
    { name: 'UserAddition.Military_Kind', value: toFieldValue(kindCode) },
    { name: 'UserAddition.Military_SYM', value: toFieldValue(start) },
    { name: 'UserAddition.Military_EYM', value: toFieldValue(end) },
    { name: 'InputStat.UserAdditionInputStat', value: 'True' },
    { name: 'PIOfferAgree.IpAgree', value: '1' },
  ];
}

/**
 * Map awards to JobKorea form fields.
 * @param {object} ssot - SSOT resume data
 * @param {string[]} [indices] - Server-generated entry indices.
 * SSOT currently stores `achievements` as string[] and has no structured
 * `awards` entries, so real SSOT input returns an empty field set.
 */
export function mapAwardToFormFields(ssot, indices) {
  // Use structured awards[] from SSoT. No fallback to achievements[].
  const awards = Array.isArray(ssot?.awards) ? ssot.awards : [];
  if (awards.length === 0) return [];

  const fields = [];
  const keys =
    indices && indices.length >= awards.length ? indices : awards.map((_, i) => `c${i + 1}`);

  awards.forEach((award, idx) => {
    if (idx >= keys.length) return;
    const key = keys[idx];
    pushField(fields, `Award[${key}].Index_Name`, key);
    pushField(fields, `Award[${key}].Award_Name`, award?.name || '');
    pushField(fields, `Award[${key}].Award_Inst_Name`, award?.organization || '');
    pushField(fields, `Award[${key}].Award_Year`, award?.year || '');
    pushField(fields, `Award[${key}].Award_Cntnt`, '');
  });

  pushField(fields, 'Award.index', keys.slice(0, awards.length).join(','));
  pushField(fields, 'InputStat.AwardInputStat', 'True');
  return fields;
}

export function mapPortfolioToFormFields(ssot, fileIdx) {
  const url = ssot?.personal?.portfolio || '';
  if (!url || !fileIdx) return [];

  return [
    { name: 'UserResume.Attach_File_Name', value: fileIdx + ',' },
    { name: 'InputStat.PortfolioInputStat', value: 'True' },
  ];
}

/**
 * Register a portfolio URL via AddUserFileDB and return the server-generated IDX.
 * @param {import('playwright').Page} page
 * @param {string} url - Portfolio URL to register
 * @returns {Promise<number|null>} File IDX or null on failure
 */
export async function registerPortfolioUrl(page, url) {
  const result = await page.evaluate(async (u) => {
    return new Promise(r => {
      $.post('/User/Resume/AddUserFileDB', {
        File_Name: u, Display_File_Name: u,
        File_Type: 2, File_Up_Stat: 2, File_Size: 0
      }, res => r(res)).fail(() => r(null));
    });
  }, url);
  return result?.sc === 1 ? result.idx : null;
}

export function mapHopeJobToFormFields(ssot) {
  // Derive hope-job codes from SSoT career roles via JK_JOB_CODES lookup.
  // Falls back to hardcoded defaults if no matching roles found.
  const codes = new Map(); // code -> name
  const careers = Array.isArray(ssot?.careers) ? ssot.careers : [];
  for (const career of careers) {
    const role = (career?.role || career?.position || '').trim();
    if (!role) continue;
    for (const [label, code] of Object.entries(JK_JOB_CODES)) {
      if (role.includes(label) || label.includes(role)) {
        codes.set(String(code), label);
      }
    }
  }

  // Fallback: use default codes if no matches from SSoT careers.
  if (codes.size === 0) {
    codes.set('1000233', '시스템엔지니어');
    codes.set('1000238', '보안엔지니어');
  }

  const codeValues = [...codes.keys()].join(',');
  const nameValues = [...codes.values()].join(',');

  return [
    { name: 'HopeJob.HJ_Code', value: String(JK_JOB_CATEGORY) },
    { name: 'HopeJob.HJ_Name_Code', value: codeValues },
    { name: 'HopeJob.HJ_Name', value: nameValues },
    { name: 'HopeJob.HJ_Local_Code', value: 'I000' },
    { name: 'HopeJob.HJ_Local_Name', value: '서울전체' },
    { name: 'InputStat.HopeJobInputStat', value: 'True' },
  ];
}

/**
 * Build complete JobKorea form data from SSOT.
 * @param {object} ssot - SSOT resume data
 * @param {object} [sectionIndices] - Server-generated indices per section:
 *   { career: string[], license: string[], award: string[], school: string }
 */
export function buildJobKoreaFormData(ssot, sectionIndices = {}) {
  return [
    ...mapCareersToFormFields(ssot, sectionIndices.career),
    ...mapSchoolToFormFields(ssot, sectionIndices.school),
    ...mapLicensesToFormFields(ssot, sectionIndices.license),
    ...mapMilitaryToFormFields(ssot),
    ...mapAwardToFormFields(ssot, sectionIndices.award),
    ...mapHopeJobToFormFields(ssot),
    ...mapPortfolioToFormFields(ssot, sectionIndices.portfolio),
  ];
}

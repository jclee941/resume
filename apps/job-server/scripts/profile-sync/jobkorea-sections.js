export const JK_JOB_CODES = {
  보안엔지니어: 1000238,
  '보안운영 담당': 1000238,
  '보안 구축 담당': 1000238,
  정보보호팀: 1000238,
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

function toYYYYMM(dateStr) {
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

function parseRange(period) {
  const parts = String(period || '')
    .split('~')
    .map((part) => part.trim());
  const start = toYYYYMM(parts[0] || '');
  const rawEnd = parts[1] || '';
  const isCurrent = rawEnd.includes('현재');
  const end = isCurrent ? '' : toYYYYMM(rawEnd);
  return { start, end, isCurrent };
}

function codeToMainFieldName(code) {
  if (code === 1000238) return '보안엔지니어';
  return '시스템엔지니어';
}

function militaryKindToCode(kind) {
  if (kind === '사회복무요원') return 7;
  return MILITARY_KIND[kind] || 8;
}

export function mapCareersToFormFields(ssot) {
  const careers = Array.isArray(ssot?.careers) ? ssot.careers : [];
  if (careers.length === 0) return [];

  const fields = [];
  const indexes = [];

  careers.forEach((career, idx) => {
    const key = `c${idx + 1}`;
    const { start, end, isCurrent } = parseRange(career?.period || '');
    const code = JK_JOB_CODES[career?.role] || 1000233;
    const roleName = codeToMainFieldName(code);

    indexes.push(key);
    pushField(fields, `Career[${key}].C_Name`, career?.company || '');
    pushField(fields, `Career[${key}].C_Part`, career?.department || '');
    pushField(fields, `Career[${key}].CSYM`, start);
    pushField(fields, `Career[${key}].CEYM`, end);
    pushField(fields, `Career[${key}].M_MainField`, code);
    pushField(fields, `Career[${key}].M_MainFieldName`, roleName);
    pushField(fields, `Career[${key}].M_Part_Code`, JK_JOB_CATEGORY);
    pushField(fields, `Career[${key}].Prfm_Prt`, String(career?.description || '').slice(0, 500));
    pushField(fields, `Career[${key}].RetireSt`, isCurrent ? 1 : 2);
    pushField(fields, `Career[${key}].Pos_Name`, career?.role || roleName);
  });

  pushField(fields, 'Career.index', indexes.join(','));
  return fields;
}

export function mapSchoolToFormFields(ssot) {
  const education = ssot?.education;
  if (!education) return [];

  const key = 'c1';
  const isEnrolled = education.status === '재학중';
  const gradYM = isEnrolled ? '' : toYYYYMM(education.endDate || '');
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
  ];
}

export function mapLicensesToFormFields(ssot) {
  const certifications = Array.isArray(ssot?.certifications) ? ssot.certifications : [];
  if (certifications.length === 0) return [];

  const fields = [];
  const indexes = [];

  certifications.forEach((cert, idx) => {
    const key = `c${idx + 1}`;
    indexes.push(key);
    pushField(fields, `License[${key}].Lc_Name`, cert?.name || '');
    pushField(fields, `License[${key}].Lc_Pub`, cert?.issuer || '');
    pushField(fields, `License[${key}].Lc_YYMM`, toYYYYMM(cert?.date || ''));
  });

  pushField(fields, 'License.index', indexes.join(','));
  pushField(fields, 'InputStat.LicenseInputStat', 'True');
  return fields;
}

export function mapMilitaryToFormFields(ssot) {
  const military = ssot?.military;
  if (!military) return [];

  const { start, end } = parseRange(military.period || '');
  const statCode = MILITARY_STAT[military.status] || MILITARY_STAT.해당없음;
  const kindCode = militaryKindToCode(military.type);

  return [
    { name: 'UserAddition.Military_Stat', value: toFieldValue(statCode) },
    { name: 'UserAddition.Military_Kind', value: toFieldValue(kindCode) },
    { name: 'UserAddition.Military_SYM', value: toFieldValue(start) },
    { name: 'UserAddition.Military_EYM', value: toFieldValue(end) },
    { name: 'InputStat.UserAdditionInputStat', value: 'True' },
    { name: 'PIOfferAgree.IpAgree', value: '1' },
  ];
}

export function mapAwardToFormFields(ssot) {
  const awards = Array.isArray(ssot?.awards) ? ssot.awards : [];
  if (awards.length === 0) return [];

  const fields = [];
  const indexes = [];

  awards.forEach((award, idx) => {
    const key = `c${idx + 1}`;
    indexes.push(key);
    pushField(fields, `Award[${key}].Awd_Name`, award?.name || '');
    pushField(fields, `Award[${key}].Awd_Agency`, award?.organization || '');
    pushField(fields, `Award[${key}].Awd_Year`, award?.year || '');
  });

  pushField(fields, 'Award.index', indexes.join(','));
  pushField(fields, 'InputStat.AwardInputStat', 'True');
  return fields;
}

export function mapHopeJobToFormFields() {
  return [
    { name: 'HopeJob.HJ_Code', value: '10031' },
    { name: 'HopeJob.HJ_Name_Code', value: '1000233,1000238' },
    { name: 'HopeJob.HJ_Name', value: '시스템엔지니어,보안엔지니어' },
    { name: 'HopeJob.HJ_Local_Code', value: 'I000' },
    { name: 'HopeJob.HJ_Local_Name', value: '서울전체' },
    { name: 'InputStat.HopeJobInputStat', value: 'True' },
  ];
}

export function buildJobKoreaFormData(ssot) {
  return [
    ...mapCareersToFormFields(ssot),
    ...mapSchoolToFormFields(ssot),
    ...mapLicensesToFormFields(ssot),
    ...mapMilitaryToFormFields(ssot),
    ...mapAwardToFormFields(ssot),
    ...mapHopeJobToFormFields(ssot),
  ];
}

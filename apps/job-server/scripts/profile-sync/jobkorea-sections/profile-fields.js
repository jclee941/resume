import { GRAD_TYPE, MAJOR_TYPE, MILITARY_KIND, MILITARY_STAT, SCHOOL_TYPE } from './constants.js';
import { parseRange, pushField, toFieldValue, toYYYYMM } from './validators.js';

function militaryKindToCode(kind) {
  if (kind === '사회복무요원') return 7;
  return MILITARY_KIND[kind] || 8;
}

export function mapSchoolToFormFields(ssot, schoolIndex) {
  const education = ssot?.education;
  if (!education) return [];
  const key = schoolIndex || 'c1';
  const startRaw = toYYYYMM(education.startDate || '');
  const gradYM =
    education.status === '재학중'
      ? startRaw.length >= 4
        ? `${parseInt(startRaw.slice(0, 4), 10) + 4}02`
        : ''
      : toYYYYMM(education.endDate || '');
  const schoolTypeCode = SCHOOL_TYPE[education.schoolType] ?? SCHOOL_TYPE['4년제'];
  const majorTypeCode = MAJOR_TYPE[education.majorType] ?? 1;

  return [
    [`UnivSchool[${key}].Schl_Name`, education.school || ''],
    [`UnivSchool[${key}].Schl_Type_Code`, schoolTypeCode],
    [`UnivSchool[${key}].Entc_YM`, startRaw],
    [`UnivSchool[${key}].Grad_YM`, gradYM],
    [`UnivSchool[${key}].Grad_Type_Code`, GRAD_TYPE[education.status] || GRAD_TYPE.재학중],
    [`UnivSchool[${key}].UnivMajor[0].Major_Name`, education.major || ''],
    [`UnivSchool[${key}].UnivMajor[0].Major_Type_Code`, majorTypeCode],
    ['UnivSchool.index', key],
    ['InputStat.SchoolInputStat', 'True'],
  ].map(([name, value]) => ({ name, value: toFieldValue(value) }));
}

export function mapLicensesToFormFields(ssot, indices) {
  const validCerts = (Array.isArray(ssot?.certifications) ? ssot.certifications : []).filter(
    (cert) => cert?.date
  );
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
  return [
    ['UserAddition.Military_Stat', MILITARY_STAT[military.status] || MILITARY_STAT.해당없음],
    ['UserAddition.Military_Kind', militaryKindToCode(military.status)],
    ['UserAddition.Military_SYM', start],
    ['UserAddition.Military_EYM', end],
    ['InputStat.UserAdditionInputStat', 'True'],
    ['PIOfferAgree.IpAgree', '1'],
  ].map(([name, value]) => ({ name, value: toFieldValue(value) }));
}

export function mapAwardToFormFields(ssot, indices) {
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
    { name: 'UserResume.Attach_File_Name', value: `${fileIdx},` },
    { name: 'InputStat.PortfolioInputStat', value: 'True' },
  ];
}

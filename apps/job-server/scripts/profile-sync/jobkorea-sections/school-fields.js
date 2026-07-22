import { normalizeEducationStatus } from '@resume/shared/normalize';

import { GRAD_TYPE, MAJOR_TYPE, SCHOOL_TYPE } from './constants.js';
import { toFieldValue, toYYYYMM } from './validators.js';

export function mapSchoolToFormFields(ssot, schoolIndex) {
  const education = ssot?.education;
  if (!education) return [];
  const key = schoolIndex || 'c1';
  const startRaw = toYYYYMM(education.startDate || '');
  const normalizedStatus = normalizeEducationStatus(education.status);
  const effectiveStatus = Object.hasOwn(GRAD_TYPE, normalizedStatus)
    ? normalizedStatus
    : education.endDate
      ? '졸업'
      : '재학중';
  const isAttending = effectiveStatus === '재학중';
  const gradYM = isAttending
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
    [`UnivSchool[${key}].Grad_Type_Code`, GRAD_TYPE[effectiveStatus]],
    [`UnivSchool[${key}].UnivMajor[0].Major_Name`, education.major || ''],
    [`UnivSchool[${key}].UnivMajor[0].Major_Type_Code`, majorTypeCode],
    ['UnivSchool.index', key],
    ['InputStat.SchoolInputStat', 'True'],
  ].map(([name, value]) => ({ name, value: toFieldValue(value) }));
}

export function mapHighSchoolToFormFields(ssot, schoolIndex) {
  const eduName =
    typeof ssot?.education?.highSchool === 'string' ? ssot.education.highSchool.trim() : '';
  const legacy = ssot?.highSchool;
  if (!eduName && !legacy) return [];
  const key = schoolIndex || 'c1';

  if (eduName) {
    const gradRaw = String(ssot?.education?.highSchoolGraduation || '').trim();
    const gradYear = /^\d{4}/.test(gradRaw) ? gradRaw.slice(0, 4) : toYYYYMM(gradRaw).slice(0, 4);
    return [
      ['HighSchool.Schl_Name', eduName],
      ['HighSchool.Grad_Year', gradYear],
      ['HighSchool.Grad_Type_Code', GRAD_TYPE.졸업],
      ['HighSchool.index', key],
      ['InputStat.HighSchoolInputStat', 'True'],
    ].map(([name, value]) => ({ name, value: toFieldValue(value) }));
  }

  const gradYM = toYYYYMM(legacy.endDate || '');
  const gradYear = gradYM.slice(0, 4);
  const normalizedStatus = normalizeEducationStatus(legacy.status);
  const gradType = Object.hasOwn(GRAD_TYPE, normalizedStatus)
    ? GRAD_TYPE[normalizedStatus]
    : GRAD_TYPE.졸업;
  return [
    ['HighSchool.Schl_Name', legacy.school || ''],
    ['HighSchool.Grad_Year', gradYear],
    ['HighSchool.Grad_Type_Code', gradType],
    ['HighSchool.index', key],
    ['InputStat.HighSchoolInputStat', 'True'],
  ].map(([name, value]) => ({ name, value: toFieldValue(value) }));
}

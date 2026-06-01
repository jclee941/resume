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
    pushField(fields, `License[${key}].Lc_Exp`, toYYYYMM(cert?.expirationDate || ''));
    pushField(fields, `License[${key}].Lc_CredId`, cert?.credentialId || '');
    pushField(fields, `License[${key}].Lc_CredUrl`, cert?.credentialUrl || '');
    pushField(fields, `License[${key}].Lc_Status`, cert?.status || '');
    pushField(fields, `License[${key}].Lc_Note`, cert?.note || '');
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
  const achievements = Array.isArray(ssot?.achievements) ? ssot.achievements : [];
  if (awards.length === 0 && achievements.length === 0) return [];
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
  if (awards.length > 0) {
    pushField(fields, 'Award.index', keys.slice(0, awards.length).join(','));
    pushField(fields, 'InputStat.AwardInputStat', 'True');
  } else if (achievements.length > 0) {
    pushField(
      fields,
      'UserResume.M_Career_Text',
      achievements
        .filter(Boolean)
        .map((a) => `- ${a}`)
        .join('\n')
        .slice(0, 2000)
    );
    pushField(fields, 'UserResume.M_Career_Text_Stat', '1');
  }
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

export function mapHighSchoolToFormFields(ssot, schoolIndex) {
  const highSchool = ssot?.highSchool;
  if (!highSchool) return [];
  const key = schoolIndex || 'c1';
  const startRaw = toYYYYMM(highSchool.startDate || '');
  const gradYM = toYYYYMM(highSchool.endDate || '');
  return [
    [`HighSchool[${key}].Schl_Name`, highSchool.school || ''],
    [`HighSchool[${key}].Entc_YM`, startRaw],
    [`HighSchool[${key}].Grad_YM`, gradYM],
    [`HighSchool[${key}].Grad_Type_Code`, GRAD_TYPE[highSchool.status] || GRAD_TYPE.졸업],
    ['HighSchool.index', key],
    ['InputStat.HighSchoolInputStat', 'True'],
  ].map(([name, value]) => ({ name, value: toFieldValue(value) }));
}

export function mapLanguagesToFormFields(ssot, indices) {
  const languages = Array.isArray(ssot?.languages) ? ssot.languages : [];
  if (languages.length === 0) return [];
  const fields = [];
  const keys =
    indices && indices.length >= languages.length ? indices : languages.map((_, i) => `c${i + 1}`);
  languages.forEach((lang, idx) => {
    if (idx >= keys.length) return;
    const key = keys[idx];
    pushField(fields, `Language[${key}].Index_Name`, key);
    pushField(fields, `Language[${key}].Lang1_Name`, lang?.name || '');
    pushField(fields, `Language[${key}].Lang1_Stat`, lang?.level || '');
  });
  pushField(fields, 'Language.index', keys.slice(0, languages.length).join(','));
  pushField(fields, 'InputStat.LanguageInputStat', 'True');
  return fields;
}

export function mapPersonalFieldsToFormFields(ssot) {
  const personal = ssot?.personal || {};
  const fields = [];
  if (personal.birthDate) {
    pushField(fields, 'UserResume.Birth_YMD', personal.birthDate.replace(/-/g, ''));
  }
  if (personal.address) {
    pushField(fields, 'UserResume.Address', personal.address);
  }
  if (personal.github) {
    pushField(fields, 'UserResume.GitHub', personal.github);
  }
  return fields;
}

export function mapPersonalProjectsToFormFields(ssot, indices) {
  const projects = Array.isArray(ssot?.personalProjects) ? ssot.personalProjects : [];
  if (projects.length === 0) return [];
  const fields = [];
  const keys =
    indices && indices.length >= projects.length ? indices : projects.map((_, i) => `c${i + 1}`);
  projects.forEach((project, idx) => {
    if (idx >= keys.length) return;
    const key = keys[idx];
    pushField(fields, `Project[${key}].Index_Name`, key);
    pushField(fields, `Project[${key}].P_Name`, project?.name || '');
    pushField(fields, `Project[${key}].P_Cntnt`, String(project?.description || '').slice(0, 500));
    pushField(fields, `Project[${key}].P_Url`, project?.url || '');
  });
  pushField(fields, 'Project.index', keys.slice(0, projects.length).join(','));
  pushField(fields, 'InputStat.ProjectInputStat', 'True');
  return fields;
}

export function mapSkillsToFormFields(ssot, indices) {
  const categories = ssot?.skills || {};
  const skills = [];
  for (const category of Object.values(categories)) {
    if (category && Array.isArray(category.items)) {
      for (const item of category.items) {
        if (typeof item === 'object' && item?.name) {
          skills.push(item);
        } else if (typeof item === 'string') {
          skills.push({ name: item });
        }
      }
    }
  }
  if (skills.length === 0) return [];
  const fields = [];
  const keys =
    indices && indices.length >= skills.length ? indices : skills.map((_, i) => `c${i + 1}`);
  skills.forEach((skill, idx) => {
    if (idx >= keys.length) return;
    const key = keys[idx];
    pushField(fields, `Skill[${key}].Index_Name`, key);
    pushField(fields, `Skill[${key}].Skill_Name`, skill.name || '');
    pushField(fields, `Skill[${key}].Skill_Level`, skill.level || '');
  });
  pushField(fields, 'Skill.index', keys.slice(0, skills.length).join(','));
  pushField(fields, 'InputStat.SkillInputStat', 'True');
  return fields;
}

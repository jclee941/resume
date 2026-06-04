/**
 * JobKorea field mapping — sections currently covered:
 *   careers, school, licenses, awards, military, hopeJob, portfolio,
 *   skills, languages, personalFields, personalProjects, highSchool.
 *
 * Skills mapping uses best-effort field names (Skill[cN].Skill_Name etc.)
 * pending live DOM verification. See docs/architecture/RESUME_SYNC_AUDIT_2026-04-29.md.
 */
export { registerPortfolioUrl } from './jobkorea-sections/api-client.js';
export { buildJobKoreaFormData } from './jobkorea-sections/base.js';
export {
  GRAD_TYPE,
  JK_JOB_CATEGORY,
  JK_JOB_CODES,
  JK_LOCATION_CODES,
  MAJOR_TYPE,
  MILITARY_KIND,
  MILITARY_STAT,
  SCHOOL_TYPE,
  mapAwardToFormFields,
  mapCareersToFormFields,
  mapHopeJobToFormFields,
  mapIntroToFormFields,
  mapResumeTitleToFormFields,
  mapLicensesToFormFields,
  mapMilitaryToFormFields,
  mapPortfolioToFormFields,
  mapSchoolToFormFields,
  mapHighSchoolToFormFields,
  mapLanguagesToFormFields,
  mapPersonalFieldsToFormFields,
  mapPersonalProjectsToFormFields,
  mapSkillsToFormFields,
  normalizeCompanyName,
  JOBKOREA_RESUME_TITLE,
} from './jobkorea-sections/field-mappers.js';
export { parseRange, toYYYYMM } from './jobkorea-sections/validators.js';

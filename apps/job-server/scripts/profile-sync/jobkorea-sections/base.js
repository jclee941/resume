import {
  mapAwardToFormFields,
  mapCareersToFormFields,
  mapHopeJobToFormFields,
  mapLicensesToFormFields,
  mapMilitaryToFormFields,
  mapPortfolioToFormFields,
  mapSchoolToFormFields,
  mapHighSchoolToFormFields,
  mapLanguagesToFormFields,
  mapPersonalFieldsToFormFields,
  mapPersonalProjectsToFormFields,
  mapSkillsToFormFields,
} from './field-mappers.js';

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
    ...mapHighSchoolToFormFields(ssot, sectionIndices.highSchool),
    ...mapLicensesToFormFields(ssot, sectionIndices.license),
    ...mapMilitaryToFormFields(ssot),
    ...mapAwardToFormFields(ssot, sectionIndices.award),
    ...mapHopeJobToFormFields(ssot),
    ...mapPortfolioToFormFields(ssot, sectionIndices.portfolioFileIdx),
    ...mapSkillsToFormFields(ssot, sectionIndices.skill),
    ...mapLanguagesToFormFields(ssot, sectionIndices.language),
    ...mapPersonalProjectsToFormFields(ssot, sectionIndices.personalProject),
    ...mapPersonalFieldsToFormFields(ssot),
  ];
}

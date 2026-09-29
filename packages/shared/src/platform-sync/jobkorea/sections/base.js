import {
  mapAwardToFormFields,
  mapCareersToFormFields,
  mapLicensesToFormFields,
  mapMilitaryToFormFields,
  mapPortfolioToFormFields,
  mapSchoolToFormFields,
  mapHighSchoolToFormFields,
  mapLanguagesToFormFields,
  mapPersonalFieldsToFormFields,
  mapPersonalProjectsToFormFields,
  mapSkillsToFormFields,
  mapHopeJobToFormFields,
  mapIntroToFormFields,
  mapResumeTitleToFormFields,
} from './field-mappers.js';

/**
 * @typedef {{
 *   career?: string[];
 *   school?: string | number;
 *   license?: string[];
 *   award?: string[];
 *   portfolioFileIdx?: string | number;
 *   language?: string[];
 *   highSchool?: string | number;
 *   skill?: string[];
 *   project?: string[];
 *   intro?: string[];
 * }} JobKoreaSectionIndices
 */

/**
 * Build complete JobKorea form data from SSOT.
 * @param {object} ssot - SSOT resume data
 * @param {JobKoreaSectionIndices} [sectionIndices] - Server-generated indices per section:
 *   { career: string[], license: string[], award: string[], school: string,
 *     language: string[], highSchool: string, skill: string[],
 *     project: string[] }
 */
export function buildJobKoreaFormData(ssot, sectionIndices = {}) {
  return [
    ...mapResumeTitleToFormFields(ssot),
    ...mapCareersToFormFields(ssot, sectionIndices.career),
    ...mapSchoolToFormFields(ssot, sectionIndices.school),
    ...mapLicensesToFormFields(ssot, sectionIndices.license),
    ...mapMilitaryToFormFields(ssot),
    ...mapAwardToFormFields(ssot, sectionIndices.award),
    ...mapPortfolioToFormFields(ssot, sectionIndices.portfolioFileIdx),
    ...mapLanguagesToFormFields(ssot, sectionIndices.language),
    ...mapPersonalFieldsToFormFields(ssot),
    ...mapHighSchoolToFormFields(ssot, sectionIndices.highSchool),
    ...mapSkillsToFormFields(ssot, sectionIndices.skill),
    ...mapPersonalProjectsToFormFields(ssot, sectionIndices.project),
    ...mapIntroToFormFields(ssot, sectionIndices.intro),
    ...mapHopeJobToFormFields(ssot),
  ];
}

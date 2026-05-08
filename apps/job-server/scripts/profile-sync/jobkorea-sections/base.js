import {
  mapAwardToFormFields,
  mapCareersToFormFields,
  mapLicensesToFormFields,
  mapMilitaryToFormFields,
  mapPortfolioToFormFields,
  mapSchoolToFormFields,
  mapLanguagesToFormFields,
  mapPersonalFieldsToFormFields,
} from './field-mappers.js';

/**
 * Build complete JobKorea form data from SSOT.
 * @param {object} ssot - SSOT resume data
 * @param {object} [sectionIndices] - Server-generated indices per section:
 *   { career: string[], license: string[], award: string[], school: string,
 *     language: string[] }
 */
export function buildJobKoreaFormData(ssot, sectionIndices = {}) {
  return [
    ...mapCareersToFormFields(ssot, sectionIndices.career),
    ...mapSchoolToFormFields(ssot, sectionIndices.school),
    ...mapLicensesToFormFields(ssot, sectionIndices.license),
    ...mapMilitaryToFormFields(ssot),
    ...mapAwardToFormFields(ssot, sectionIndices.award),
    ...mapPortfolioToFormFields(ssot, sectionIndices.portfolioFileIdx),
    ...mapLanguagesToFormFields(ssot, sectionIndices.language),
    ...mapPersonalFieldsToFormFields(ssot),
  ];
}

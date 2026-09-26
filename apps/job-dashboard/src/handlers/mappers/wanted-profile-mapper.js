import { resolveJobCategoryId } from '@resume/shared/job-categories';
import { mapWorkTypeToWantedEmploymentType } from '@resume/shared/employment-types';
import {
  normalizeCareerRole,
  normalizeCompanyName,
  normalizeEducationStatus,
} from '@resume/shared/normalize';

export function parsePeriod(period = '') {
  const parts = String(period)
    .split(/~| - /)
    .map((part) => part.trim())
    .filter(Boolean);
  const start = parts[0] ? `${parts[0].replace('.', '-')}-01` : null;
  const end = parts[1] && parts[1] !== '현재' ? `${parts[1].replace('.', '-')}-01` : null;
  return { start, end };
}

/**
 * @typedef {Object} WantedCareerInput
 * @property {string} [period]
 * @property {string} [role]
 * @property {string} [company]
 * @property {string} [workType]
 */

/**
 * @param {WantedCareerInput} career
 */
export function mapCareerToWanted(career) {
  const { start, end } = parsePeriod(career.period);
  const jobRole = normalizeCareerRole(career.role);
  return {
    company: { name: normalizeCompanyName(career.company), type: 'CUSTOM' },
    job_role: jobRole,
    job_category_id: resolveJobCategoryId(career.role),
    start_time: start,
    end_time: end,
    served: end === null,
    employment_type: mapWorkTypeToWantedEmploymentType(career.workType),
  };
}

/**
 * @typedef {Object} WantedEducationInput
 * @property {string} [status]
 * @property {string} [startDate]
 * @property {string} [endDate]
 * @property {string} [school]
 * @property {string} [major]
 */

/**
 * @param {WantedEducationInput} education
 */
export function mapEducationToWanted(education) {
  const isAttending = normalizeEducationStatus(education.status) === '재학중';
  const startTime = education.startDate ? `${education.startDate.replace('.', '-')}-01` : null;
  const endTime = isAttending
    ? null
    : education.endDate
      ? `${education.endDate.replace('.', '-')}-01`
      : null;
  return {
    school_name: education.school,
    major: education.major,
    start_time: startTime,
    end_time: endTime,
    degree: '학사',
    description: isAttending ? `재학중 (${education.startDate || ''} ~ )` : null,
  };
}

/**
 * @typedef {Object} WantedCertificationInput
 * @property {string} [name]
 * @property {string} [issuer]
 * @property {string} [date]
 */

/**
 * @param {WantedCertificationInput} certification
 */
export function mapCertificationToWanted(certification) {
  return {
    title: certification.name,
    description: `${certification.issuer || ''} | ${certification.date || ''}`.trim(),
    start_time: certification.date ? `${certification.date.replace('.', '-')}-01` : null,
    activity_type: 'CERTIFICATE',
  };
}

/**
 * @typedef {Object} WantedSsotData
 * @property {{ name?: string, email?: string, phone?: string }} [personal]
 * @property {{ position?: string }} [current]
 * @property {{ totalExperience?: string, expertise?: string[], profileStatement?: string }} [summary]
 */

/**
 * @param {WantedSsotData} ssotData
 */
export function buildProfileData(ssotData) {
  return {
    name: ssotData.personal?.name,
    email: ssotData.personal?.email,
    phone: ssotData.personal?.phone,
    headline:
      `${ssotData.current?.position || 'Engineer'} | ${ssotData.summary?.totalExperience || ''}`.trim(),
    skills: Array.isArray(ssotData.summary?.expertise) ? ssotData.summary.expertise.join(',') : '',
    summary: ssotData.summary?.profileStatement || '',
  };
}

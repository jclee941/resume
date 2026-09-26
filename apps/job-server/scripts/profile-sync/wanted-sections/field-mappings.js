import { DEFAULT_JOB_CATEGORY, hasJobCategoryMapping, resolveJobCategoryId } from '../constants.js';
import { mapWorkTypeToWantedEmploymentType } from '@resume/shared/employment-types';
import { normalizeCareerRole, normalizeCompanyName } from '@resume/shared/normalize';
import { log } from '../sync-logger.js';
import { parsePeriod } from '../period-parser.js';

/**
 * @typedef {Object} SSoTCareer
 * @property {string} period
 * @property {string} role
 * @property {string} company
 * @property {string} [workType]
 */

/**
 * @typedef {Object} WantedCareerFormat
 * @property {{ name: string, type: string }} company
 * @property {string} job_role
 * @property {number} job_category_id
 * @property {string} start_time
 * @property {string|null} end_time
 * @property {boolean} served
 * @property {string} employment_type
 */

/** @param {SSoTCareer} career @returns {WantedCareerFormat} Wanted career format */
export function mapCareerToWanted(career) {
  const { startsAt, endsAt } = parsePeriod(career.period);
  const jobRole = normalizeCareerRole(career.role);
  const jobCategoryId = resolveJobCategoryId(career.role);
  if (!hasJobCategoryMapping(career.role)) {
    log(
      `Unknown role "${jobRole}" - using default category ${DEFAULT_JOB_CATEGORY}`,
      'warn',
      'wanted'
    );
  }
  return {
    company: { name: normalizeCompanyName(career.company), type: 'CUSTOM' },
    job_role: jobRole,
    job_category_id: jobCategoryId,
    start_time: startsAt,
    end_time: endsAt,
    served: endsAt === null,
    employment_type: mapWorkTypeToWantedEmploymentType(career.workType),
  };
}

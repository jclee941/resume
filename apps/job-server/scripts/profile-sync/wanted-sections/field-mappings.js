import { DEFAULT_JOB_CATEGORY, JOB_CATEGORY_MAPPING } from '../constants.js';
import { mapWorkTypeToWantedEmploymentType } from '@resume/shared/employment-types';
import { log } from '../sync-logger.js';
import { parsePeriod } from '../period-parser.js';

/** @param {Object} career @returns {Object} Wanted career format */
export function mapCareerToWanted(career) {
  const { startsAt, endsAt } = parsePeriod(career.period);
  const jobCategoryId = JOB_CATEGORY_MAPPING[career.role] || DEFAULT_JOB_CATEGORY;
  if (!JOB_CATEGORY_MAPPING[career.role]) {
    log(
      `Unknown role "${career.role}" - using default category ${DEFAULT_JOB_CATEGORY}`,
      'warn',
      'wanted'
    );
  }
  return {
    company: { name: career.company, type: 'CUSTOM' },
    job_role: career.role,
    job_category_id: jobCategoryId,
    start_time: startsAt,
    end_time: endsAt,
    served: endsAt === null,
    employment_type: mapWorkTypeToWantedEmploymentType(career.workType),
  };
}

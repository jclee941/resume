import { flattenSkills, flattenSkillsWithLevels } from '../skill-tag-map.js';
import { resolveJobCategoryId } from '@resume/shared/job-categories';
import { mapWorkTypeToWantedEmploymentType } from '@resume/shared/employment-types';
import {
  normalizeCareerRole,
  normalizeCompanyName,
  normalizeEducationStatus,
} from '@resume/shared/normalize';
import { parseDate } from '../date-parser.js';

import { WANTED_HEADLINE_LIMIT } from './constants.js';

/**
 * @typedef {Object} WantedFormatLanguage
 * @property {string} [name]
 * @property {string} [level]
 * @property {string} [note]
 */

/**
 * @typedef {Object} WantedFormatCareer
 * @property {string} [role]
 * @property {string} [company]
 * @property {string} [period]
 * @property {string} [workType]
 */

/**
 * @typedef {Object} WantedFormatEducation
 * @property {string} [school]
 * @property {string} [major]
 * @property {string} [status]
 * @property {string} [startDate]
 * @property {string} [endDate]
 */

/**
 * @typedef {Object} WantedFormatPersonal
 * @property {string} [github]
 * @property {string} [linkedin]
 * @property {string} [portfolio]
 * @property {string} [birthDate]
 * @property {string} [address]
 */

/**
 * @typedef {Object} WantedFormatHope
 * @property {string[]} [locations]
 * @property {string[]} [roles]
 * @property {string} [salary]
 * @property {string[]} [industries]
 */

/**
 * @typedef {Object} WantedFormatCoverLetterKo
 * @property {string} [headline]
 * @property {string[]} [paragraphs]
 * @property {string} [closing]
 */

/**
 * @typedef {Object} WantedFormatSource
 * @property {{ position?: string }} [current]
 * @property {WantedFormatCareer[]} [careers]
 * @property {{ totalExperience?: string; expertise?: string[] }} [summary]
 * @property {WantedFormatEducation} [education]
 * @property {{ wanted?: { headline?: string; about?: string } }} [platformVariants]
 * @property {Record<string, import('../skill-tag-map.js').SkillCategory | null | undefined> | null | undefined} [skills]
 * @property {WantedFormatLanguage[]} [languages]
 * @property {WantedFormatHope} [hope]
 * @property {{ ko?: WantedFormatCoverLetterKo }} [coverLetter]
 * @property {WantedFormatPersonal} [personal]
 */

/**
 * Wanted resume education `status` (the editor's 졸업 상태 options) by normalized SSoT status.
 * @type {Record<string, string>}
 */
const WANTED_EDUCATION_STATUS = {
  재학중: 'ENROLLED',
  졸업예정: 'EXPECTED_GRADUATION',
  졸업: 'GRADUATED',
  수료: 'COMPLETED',
  중퇴: 'WITHDRAWN',
  휴학: 'LEAVE_OF_ABSENCE',
};

/**
 * @param {WantedFormatSource} source
 */
export function mapToWantedFormat(source) {
  const currentPosition = source.current?.position || source.careers?.[0]?.role || '';
  const totalExperience = source.summary?.totalExperience || '';
  const expertise = source.summary?.expertise || [];
  const educationStatus = normalizeEducationStatus(source.education?.status);
  const isAttending = educationStatus === '재학중';
  const wantedEducationStatus = WANTED_EDUCATION_STATUS[educationStatus];

  const wantedVariant = source.platformVariants?.wanted || {};

  return {
    profile: {
      headline: (
        wantedVariant.headline ||
        (currentPosition ? `${currentPosition} | ${totalExperience}` : totalExperience)
      ).slice(0, WANTED_HEADLINE_LIMIT),
      description: (wantedVariant.about || expertise.join(', ')).slice(0, 150),
      skills: flattenSkillsWithLevels(source.skills).slice(0, 20),
      languages: (source.languages || []).map((lang) => ({
        name: lang.name || '',
        level: lang.level || '',
        note: lang.note || '',
      })),
      hope: source.hope
        ? {
            locations: source.hope.locations || [],
            roles: source.hope.roles || [],
            salary: source.hope.salary || '',
            industries: source.hope.industries || [],
          }
        : null,
      coverLetter: source.coverLetter?.ko
        ? {
            headline: source.coverLetter.ko.headline || '',
            paragraphs: source.coverLetter.ko.paragraphs || [],
            closing: source.coverLetter.ko.closing || '',
          }
        : null,
      githubUrl: source.personal?.github || '',
      linkedinUrl: source.personal?.linkedin || '',
      portfolioUrl: source.personal?.portfolio || '',
      birthDate: source.personal?.birthDate || '',
      address: source.personal?.address || '',
    },
    careers: (source.careers || []).map((c) => {
      const [startStr, endStr] = (c.period || '').split(/~| - /).map((s) => s.trim());
      const start_time = parseDate(startStr);
      const end_time = endStr === '현재' || !endStr ? null : parseDate(endStr);
      const jobRole = normalizeCareerRole(c.role);
      const jobCategoryId = resolveJobCategoryId(c.role);

      return {
        company: { name: normalizeCompanyName(c.company), type: 'CUSTOM' },
        job_role: jobRole,
        job_category_id: jobCategoryId,
        start_time,
        end_time,
        served: end_time === null,
        employment_type: mapWorkTypeToWantedEmploymentType(c.workType),
      };
    }),
    educations: [
      {
        school_name: source.education?.school,
        major: source.education?.major,
        degree: 'BACHELOR',
        start_time: parseDate(source.education?.startDate),
        end_time: isAttending ? null : parseDate(source.education?.endDate),
        ...(wantedEducationStatus ? { status: wantedEducationStatus } : {}),
        description: isAttending ? `재학중 (${source.education?.startDate || ''} ~ )` : null,
      },
    ],
    skills: flattenSkills(source.skills).slice(0, 20),
  };
}

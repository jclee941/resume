import { flattenSkills, flattenSkillsWithLevels } from '../../../../scripts/skill-tag-map.js';
import { resolveJobCategoryId } from '../../../../scripts/profile-sync/constants.js';
import { mapWorkTypeToWantedEmploymentType } from '@resume/shared/employment-types';
import {
  normalizeCareerRole,
  normalizeCompanyName,
  normalizeEducationStatus,
} from '@resume/shared/normalize';
import { parseDate } from '../../date-parser.js';

import { WANTED_HEADLINE_LIMIT } from './constants.js';

export function mapToWantedFormat(source) {
  const currentPosition = source.current?.position || source.careers?.[0]?.role || '';
  const totalExperience = source.summary?.totalExperience || '';
  const expertise = source.summary?.expertise || [];
  const isAttending = normalizeEducationStatus(source.education?.status) === '재학중';

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
        degree: '학사',
        start_time: parseDate(source.education?.startDate),
        end_time: isAttending ? null : parseDate(source.education?.endDate),
        description: isAttending ? `재학중 (${source.education?.startDate || ''} ~ )` : null,
      },
    ],
    skills: flattenSkills(source.skills).slice(0, 20),
  };
}

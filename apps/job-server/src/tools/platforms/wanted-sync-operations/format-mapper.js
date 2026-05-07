import { flattenSkills, flattenSkillsWithLevels } from '../../../../scripts/skill-tag-map.js';
import {
  JOB_CATEGORY_MAPPING,
  DEFAULT_JOB_CATEGORY,
} from '../../../../scripts/profile-sync/constants.js';
import { parseDate } from '../../date-parser.js';

import { WANTED_HEADLINE_LIMIT } from './constants.js';

export function mapToWantedFormat(source) {
  const currentPosition = source.current?.position || source.careers?.[0]?.role || '';
  const totalExperience = source.summary?.totalExperience || '';
  const expertise = source.summary?.expertise || [];

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
      const jobCategoryId = JOB_CATEGORY_MAPPING[c.role] || DEFAULT_JOB_CATEGORY;

      return {
        company: { name: c.company, type: 'CUSTOM' },
        job_role: c.role,
        job_category_id: jobCategoryId,
        start_time,
        end_time,
        served: end_time === null,
        employment_type: 'FULLTIME',
      };
    }),
    educations: [
      {
        school_name: source.education?.school,
        major: source.education?.major,
        degree: '학사',
        start_time: parseDate(source.education?.startDate),
        end_time:
          source.education?.status === '재학중' ? null : parseDate(source.education?.endDate),
        description:
          source.education?.status === '재학중'
            ? `재학중 (${source.education?.startDate || ''} ~ )`
            : null,
      },
    ],
    skills: flattenSkills(source.skills).slice(0, 20),
  };
}

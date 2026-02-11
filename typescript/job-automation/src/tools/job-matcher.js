import { readFile } from 'fs/promises';
import { getResumeMasterDataPath } from '../shared/utils/paths.js';

const COMMON_STOPWORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'have',
  'will',
  'your',
  'you',
  'our',
  'job',
  'role',
  'team',
  'work',
  'years',
  'year',
  '경력',
  '경험',
  '업무',
  '및',
  '에서',
]);

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTokens(value) {
  return normalize(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !COMMON_STOPWORDS.has(token));
}

function unique(list) {
  return [...new Set(list)];
}

function scoreSkill(skill, keywords) {
  const normalizedSkill = normalize(skill);
  return keywords.reduce(
    (score, keyword) => (normalizedSkill.includes(keyword) ? score + 1 : score),
    0
  );
}

function buildKeywordSetFromListing(jobListing) {
  const requirements = Array.isArray(jobListing.requirements)
    ? jobListing.requirements.join(' ')
    : String(jobListing.requirements || '');

  return unique(
    toTokens(
      [
        jobListing.title || '',
        requirements,
        jobListing.description || '',
        jobListing.company || '',
      ].join(' ')
    )
  );
}

export const jobMatcherTool = {
  name: 'wanted_job_matcher',
  description:
    'Score match between a job listing and resume_data.json. Returns score (0-100), matched skills, gaps, and recommendations.',

  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Job title',
      },
      company: {
        type: 'string',
        description: 'Company name',
      },
      requirements: {
        oneOf: [
          { type: 'string' },
          {
            type: 'array',
            items: { type: 'string' },
          },
        ],
        description: 'Job requirements text or requirement lines',
      },
      description: {
        type: 'string',
        description: 'Full job description text',
      },
    },
    required: ['title', 'requirements', 'description'],
  },

  async execute(params) {
    try {
      const listingKeywords = buildKeywordSetFromListing(params);
      const resumeDataRaw = await readFile(getResumeMasterDataPath(), 'utf-8');
      const resumeData = JSON.parse(resumeDataRaw);

      const skillItems = Object.values(resumeData.skills || {}).flatMap((group) =>
        (group.items || []).map((item) => item.name)
      );

      const matchedSkills = skillItems
        .map((skill) => ({ skill, score: scoreSkill(skill, listingKeywords) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.skill);

      const matchedSkillTokenSet = new Set(
        matchedSkills
          .flatMap((skill) => toTokens(skill))
          .filter((token) => listingKeywords.includes(token))
      );

      const matchedKeywords = [...matchedSkillTokenSet];
      const gapKeywords = listingKeywords
        .filter((keyword) => !matchedSkillTokenSet.has(keyword))
        .slice(0, 20);

      const baseKeywordCoverage = listingKeywords.length
        ? Math.round((matchedKeywords.length / listingKeywords.length) * 100)
        : 0;

      const experienceBonus = Math.min((resumeData.careers || []).length * 3, 20);
      const certBonus = Math.min(
        (resumeData.certifications || []).filter((cert) => cert.status === 'active').length * 2,
        10
      );

      const score = Math.max(0, Math.min(100, baseKeywordCoverage + experienceBonus + certBonus));

      const recommendations = [];
      if (gapKeywords.length > 0) {
        recommendations.push(
          'Add quantified experience bullets that include these keywords: ' +
            gapKeywords.slice(0, 8).join(', ')
        );
      }
      if (matchedSkills.length < 5) {
        recommendations.push(
          'Highlight more relevant tools from existing projects and observability/security automation work.'
        );
      }
      if (score < 70) {
        recommendations.push(
          'Tailor profile summary to align title and domain terms from this listing.'
        );
      }

      return {
        success: true,
        match: {
          score,
          matched_skills: matchedSkills.slice(0, 15),
          matched_keywords: matchedKeywords,
          gaps: gapKeywords,
          recommendations,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default jobMatcherTool;

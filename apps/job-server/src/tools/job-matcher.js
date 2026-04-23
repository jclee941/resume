import * as fsPromises from 'fs/promises';
import {
  buildRecommendations,
  getResumeYears,
  parseRequirements,
  scoreBenefits,
  scoreCompanyCulture,
  scoreExperienceLevel,
  scoreLocation,
  scoreTechnicalSkills,
  toTokens,
  unique,
} from '../shared/services/matching/index.js';
import { getResumeMasterDataPath } from '../shared/utils/paths.js';

function buildKeywordSetFromListing(jobListing) {
  return unique(
    toTokens(
      [
        jobListing.title || '',
        parseRequirements(jobListing.requirements),
        jobListing.description || '',
        jobListing.company || '',
      ].join(' ')
    )
  );
}

function collectResumeSkills(resumeData) {
  return Object.values(resumeData.skills || {}).flatMap((group) =>
    (group.items || []).map((item) => item.name)
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
      const readFile =
        typeof params.__readFile === 'function' ? params.__readFile : fsPromises.readFile;
      const listingKeywords = buildKeywordSetFromListing(params);
      const resumeDataRaw = await readFile(getResumeMasterDataPath(), 'utf-8');
      const resumeData = JSON.parse(resumeDataRaw);

      const resumeSkills = collectResumeSkills(resumeData);
      const technical = scoreTechnicalSkills(resumeSkills, params);
      const resumeYears = getResumeYears(resumeData);
      const experience = scoreExperienceLevel(
        [
          params.experience || '',
          parseRequirements(params.requirements),
          params.description || '',
        ].join(' '),
        resumeYears
      );
      const location = scoreLocation(params, resumeData);
      const companyCulture = scoreCompanyCulture(params, resumeData);
      const benefits = scoreBenefits(params);

      const weightedScore =
        technical.score * 0.4 +
        experience.score * 0.25 +
        location.score * 0.15 +
        companyCulture * 0.1 +
        benefits * 0.1;

      const cappedScore = technical.hasHardSkillGap ? Math.min(40, weightedScore) : weightedScore;
      const score = Math.max(0, Math.min(100, Math.round(cappedScore)));

      const matchedKeywordSet = new Set(technical.matchedKeywords);
      const fallbackGaps = listingKeywords
        .filter((keyword) => !matchedKeywordSet.has(keyword))
        .slice(0, 20);
      const gapKeywords = technical.gapKeywords.length > 0 ? technical.gapKeywords : fallbackGaps;

      const detailedScore = {
        technicalSkills: technical.score,
        experienceLevel: experience.score,
        location: location.score,
        companyCulture,
        benefits,
        weightedScore: Math.round(weightedScore),
        finalScore: score,
        capApplied: technical.hasHardSkillGap,
      };

      const recommendations = buildRecommendations(
        score,
        gapKeywords,
        technical.matchedSkills,
        detailedScore
      );

      return {
        success: true,
        match: {
          score,
          matched_skills: technical.matchedSkills,
          matched_keywords: [...matchedKeywordSet],
          gaps: gapKeywords,
          recommendations,
          detailedScore,
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

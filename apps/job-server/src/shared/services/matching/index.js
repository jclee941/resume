export {
  loadResume,
  extractSkills,
  extractExperience,
  DEFAULT_SCORING_CONFIG,
  JobMatcher,
  createFileResumeReader,
  createScoringConfig,
  defaultResumeReader,
  calculateMatchScore,
  filterAndRankJobs,
  prioritizeApplications,
  default as jobMatcher,
} from './job-matcher.js';

export { normalize, toTokens, unique, jaccardSimilarity, parseRequirements } from './text-utils.js';

export { parseExperienceYears, getResumeYears, scoreExperienceLevel } from './experience-scorer.js';

export { getCity, scoreLocation } from './location-scorer.js';

export {
  SKILL_ALIASES,
  DOMAIN_SKILL_PATTERN,
  normalizeSkillPhrase,
  canonicalizeSkill,
  getSkillWeight,
  extractSkillCandidates,
  scoreTechnicalSkills,
} from './skill-scorer.js';

export { scoreCompanyCulture, scoreBenefits, buildRecommendations } from './soft-scorer.js';

export {
  calculateAIMatch,
  extractKeywordsWithAI,
  getCareerAdvice,
  getAICareerAdvice,
  matchJobsWithAI,
  analyzeResume,
  analyzeJobPosting,
  analyzeWithClaude,
} from './ai-matcher.js';

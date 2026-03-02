export {
  loadResume,
  extractSkills,
  extractExperience,
  calculateMatchScore,
  filterAndRankJobs,
  prioritizeApplications,
  default as JobMatcher,
} from './job-matcher.js';

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

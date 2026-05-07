/**
 * Cover Letter Generator
 *
 * Backward-compatible barrel for focused cover letter generation modules.
 *
 * @module shared/services/resume/cover-letter-generator
 */

export { buildAIPrompt } from './cover-letter-generator/ai-generation.js';
export { generateCoverLetter } from './cover-letter-generator/letter-generation.js';
export { detectRole, getRoleIntro } from './cover-letter-generator/role-detection.js';
export {
  buildEnglishCoverLetter,
  buildKoreanCoverLetter,
  buildTemplateFallback,
} from './cover-letter-generator/template-selection.js';
export {
  buildJobText,
  collectResumeSkills,
  getMatchedSkills,
  getRelevantAchievements,
  inferDomain,
  parseYears,
  toTokens,
  unique,
} from './cover-letter-generator/text-analysis.js';

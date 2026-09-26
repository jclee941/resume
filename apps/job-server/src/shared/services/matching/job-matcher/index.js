export { SKILL_CATEGORIES } from './skill-categories.js';
export {
  createFileResumeReader,
  defaultResumeReader,
  loadResume,
  extractSkills,
  extractExperience,
} from './resume-analysis.js';
export { DEFAULT_SCORING_CONFIG, createScoringConfig, calculateMatchScore } from './scoring.js';
export { filterAndRankJobs, prioritizeApplications } from './ranking.js';

import { loadResume, extractSkills, extractExperience } from './resume-analysis.js';
import { DEFAULT_SCORING_CONFIG, calculateMatchScore, createScoringConfig } from './scoring.js';
import { filterAndRankJobs, prioritizeApplications } from './ranking.js';

export class JobMatcher {
  /**
   * @param {Partial<import('./scoring.js').ScoringConfig> & { scoringConfig?: Partial<import('./scoring.js').ScoringConfig>, resumeReader?: (resumePath?: string) => string }} [options]
   */
  constructor(options = {}) {
    /** @type {import('./scoring.js').ScoringConfig} */
    this.scoringConfig = createScoringConfig(options.scoringConfig || options);
    /** @type {(resumePath?: string) => string} */
    this.resumeReader = options.resumeReader || loadResume;
  }

  /**
   * @param {string} [resumePath]
   * @returns {string}
   */
  loadResume(resumePath) {
    return this.resumeReader(resumePath);
  }

  /**
   * @param {string} resumeText
   * @returns {Map<string, { keywords: string[]; weight: number; count: number }>}
   */
  extractSkills(resumeText) {
    return extractSkills(resumeText, {
      skillCategories: this.scoringConfig.skillCategories,
    });
  }

  /**
   * @param {string} resumeText
   * @returns {number}
   */
  extractExperience(resumeText) {
    return extractExperience(resumeText);
  }

  /**
   * @param {import('./scoring.js').ScoringJob} job
   * @param {Iterable<[string, import('./scoring.js').SkillCategoryConfig]>} resumeSkills
   * @param {number} resumeExperience
   * @returns {ReturnType<typeof calculateMatchScore>}
   */
  calculateMatchScore(job, resumeSkills, resumeExperience) {
    return calculateMatchScore(job, resumeSkills, resumeExperience, {
      scoringConfig: this.scoringConfig,
    });
  }

  /**
   * @param {Parameters<typeof filterAndRankJobs>[0]} jobs
   * @param {{ resumeReader?: (resumePath?: string) => string, scoringConfig?: Partial<import('./scoring.js').ScoringConfig>, [key: string]: unknown }} [options]
   * @returns {ReturnType<typeof filterAndRankJobs>}
   */
  filterAndRankJobs(jobs, options = {}) {
    return filterAndRankJobs(jobs, {
      ...options,
      resumeReader: options.resumeReader || this.resumeReader,
      scoringConfig: options.scoringConfig || this.scoringConfig,
    });
  }

  /**
   * @param {Parameters<typeof prioritizeApplications>[0]} scoredJobs
   * @returns {ReturnType<typeof prioritizeApplications>}
   */
  prioritizeApplications(scoredJobs) {
    return prioritizeApplications(scoredJobs);
  }
}

const defaultMatcher = new JobMatcher({ scoringConfig: DEFAULT_SCORING_CONFIG });

export default {
  JobMatcher,
  loadResume,
  extractSkills,
  extractExperience,
  calculateMatchScore,
  filterAndRankJobs,
  prioritizeApplications,
  defaultMatcher,
};

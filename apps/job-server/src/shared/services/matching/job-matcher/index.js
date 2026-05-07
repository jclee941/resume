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
  constructor(options = {}) {
    this.scoringConfig = createScoringConfig(options.scoringConfig || options);
    this.resumeReader = options.resumeReader || loadResume;
  }

  loadResume(resumePath) {
    return this.resumeReader(resumePath);
  }

  extractSkills(resumeText) {
    return extractSkills(resumeText, {
      skillCategories: this.scoringConfig.skillCategories,
    });
  }

  extractExperience(resumeText) {
    return extractExperience(resumeText);
  }

  calculateMatchScore(job, resumeSkills, resumeExperience) {
    return calculateMatchScore(job, resumeSkills, resumeExperience, {
      scoringConfig: this.scoringConfig,
    });
  }

  filterAndRankJobs(jobs, options = {}) {
    return filterAndRankJobs(jobs, {
      ...options,
      resumeReader: options.resumeReader || this.resumeReader,
      scoringConfig: options.scoringConfig || this.scoringConfig,
    });
  }

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

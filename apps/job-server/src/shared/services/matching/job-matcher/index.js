export { SKILL_CATEGORIES } from './skill-categories.js';
export { loadResume, extractSkills, extractExperience } from './resume-analysis.js';
export { calculateMatchScore } from './scoring.js';
export { filterAndRankJobs, prioritizeApplications } from './ranking.js';

import { loadResume, extractSkills, extractExperience } from './resume-analysis.js';
import { calculateMatchScore } from './scoring.js';
import { filterAndRankJobs, prioritizeApplications } from './ranking.js';

export default {
  loadResume,
  extractSkills,
  extractExperience,
  calculateMatchScore,
  filterAndRankJobs,
  prioritizeApplications,
};

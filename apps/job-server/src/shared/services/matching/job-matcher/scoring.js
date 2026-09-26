import { SKILL_CATEGORIES } from './skill-categories.js';

/**
 * @typedef {Object} SkillCategoryConfig
 * @property {string[]} keywords
 * @property {number} weight
 */

/**
 * @typedef {Object} ScoringConfig
 * @property {Record<string, SkillCategoryConfig>} skillCategories
 * @property {string[]} preferredLocations
 * @property {string[]} topCompanies
 * @property {number} skillKeywordScore
 * @property {number} skillCategoryMaxScore
 * @property {number} experienceMaxScore
 * @property {number} experiencePartialScore
 * @property {number} experienceMaxToleranceYears
 * @property {number} experienceMinToleranceYears
 * @property {number} locationMaxScore
 * @property {number} bonusMaxScore
 * @property {number} financeBonusScore
 * @property {number} automationBonusScore
 * @property {number} topCompanyBonusScore
 */

/**
 * @typedef {Object} ScoringJob
 * @property {string} [position]
 * @property {string} [description]
 * @property {string} [requirements]
 * @property {string} [techStack]
 * @property {number} [experienceMin]
 * @property {number} [experienceMax]
 * @property {number} [annual_from]
 * @property {number} [annual_to]
 * @property {string} [location]
 * @property {string | null} [company]
 */

/**
 * @typedef {Object} SkillMatch
 * @property {string} category
 * @property {string} keyword
 */

/**
 * @typedef {Object} MatchDetails
 * @property {SkillMatch[]} skillMatches
 * @property {boolean} experienceMatch
 * @property {boolean} locationMatch
 * @property {string[]} bonusPoints
 */

export const DEFAULT_SCORING_CONFIG = Object.freeze({
  skillCategories: SKILL_CATEGORIES,
  preferredLocations: ['서울', 'seoul', '판교', 'pangyo', '성남'],
  topCompanies: [
    '네이버',
    'naver',
    '카카오',
    'kakao',
    '토스',
    'toss',
    '쿠팡',
    'coupang',
    '라인',
    'line',
    '당근',
    'anthropic',
  ],
  skillKeywordScore: 5,
  skillCategoryMaxScore: 15,
  experienceMaxScore: 20,
  experiencePartialScore: 10,
  experienceMaxToleranceYears: 3,
  experienceMinToleranceYears: 2,
  locationMaxScore: 10,
  bonusMaxScore: 10,
  financeBonusScore: 5,
  automationBonusScore: 3,
  topCompanyBonusScore: 2,
});

/**
 * @param {Partial<ScoringConfig>} [overrides]
 * @returns {ScoringConfig}
 */
export function createScoringConfig(overrides = {}) {
  return {
    ...DEFAULT_SCORING_CONFIG,
    ...overrides,
    skillCategories: overrides.skillCategories || DEFAULT_SCORING_CONFIG.skillCategories,
    preferredLocations: overrides.preferredLocations || DEFAULT_SCORING_CONFIG.preferredLocations,
    topCompanies: overrides.topCompanies || DEFAULT_SCORING_CONFIG.topCompanies,
  };
}

/**
 * @param {ScoringJob} job
 * @returns {string}
 */
function buildJobText(job) {
  return `${job.position || ''} ${job.description || ''} ${job.requirements || ''} ${job.techStack || ''}`.toLowerCase();
}

/**
 * @param {string} jobText
 * @param {Iterable<[string, SkillCategoryConfig]>} resumeSkills
 * @param {MatchDetails} matchDetails
 * @param {ScoringConfig} config
 * @returns {{ score: number, maxScore: number }}
 */
function scoreSkills(jobText, resumeSkills, matchDetails, config) {
  let score = 0;
  let maxScore = 0;

  for (const [category, skillData] of resumeSkills) {
    const categoryConfig = config.skillCategories[category] || skillData;
    let categoryMatches = 0;

    for (const keyword of skillData.keywords) {
      if (jobText.includes(keyword.toLowerCase())) {
        categoryMatches++;
        matchDetails.skillMatches.push({ category, keyword });
      }
    }

    if (categoryMatches > 0) {
      score += Math.min(
        categoryMatches * config.skillKeywordScore * categoryConfig.weight,
        config.skillCategoryMaxScore
      );
    }
    maxScore += config.skillCategoryMaxScore;
  }

  return { score, maxScore };
}

/**
 * @param {ScoringJob} job
 * @param {number} resumeExperience
 * @param {MatchDetails} matchDetails
 * @param {ScoringConfig} config
 * @returns {{ score: number, maxScore: number }}
 */
function scoreExperience(job, resumeExperience, matchDetails, config) {
  const jobExpMin = job.experienceMin || job.annual_from || 0;
  const jobExpMax = job.experienceMax || job.annual_to || 99;

  if (
    resumeExperience >= jobExpMin &&
    resumeExperience <= jobExpMax + config.experienceMaxToleranceYears
  ) {
    matchDetails.experienceMatch = true;
    return { score: config.experienceMaxScore, maxScore: config.experienceMaxScore };
  }
  if (resumeExperience >= jobExpMin - config.experienceMinToleranceYears) {
    return { score: config.experiencePartialScore, maxScore: config.experienceMaxScore };
  }

  return { score: 0, maxScore: config.experienceMaxScore };
}

/**
 * @param {ScoringJob} job
 * @param {MatchDetails} matchDetails
 * @param {ScoringConfig} config
 * @returns {{ score: number, maxScore: number }}
 */
function scoreLocation(job, matchDetails, config) {
  const jobLocation = (job.location || '').toLowerCase();
  if (config.preferredLocations.some((loc) => jobLocation.includes(loc))) {
    matchDetails.locationMatch = true;
    return { score: config.locationMaxScore, maxScore: config.locationMaxScore };
  }

  return { score: 0, maxScore: config.locationMaxScore };
}

/**
 * @param {ScoringJob} job
 * @param {string} jobText
 * @param {MatchDetails} matchDetails
 * @param {ScoringConfig} config
 * @returns {{ score: number, maxScore: number }}
 */
function scoreBonus(job, jobText, matchDetails, config) {
  let score = 0;

  if (jobText.includes('금융') || jobText.includes('finance') || jobText.includes('fintech')) {
    score += config.financeBonusScore;
    matchDetails.bonusPoints.push('금융권 경험 매칭');
  }

  if (jobText.includes('ai') || jobText.includes('자동화') || jobText.includes('automation')) {
    score += config.automationBonusScore;
    matchDetails.bonusPoints.push('AI/자동화 경험 매칭');
  }

  if (config.topCompanies.some((company) => (job.company || '').toLowerCase().includes(company))) {
    score += config.topCompanyBonusScore;
    matchDetails.bonusPoints.push('주요 기업');
  }

  return { score, maxScore: config.bonusMaxScore };
}

/**
 * @param {ScoringJob} job
 * @param {Iterable<[string, SkillCategoryConfig]>} resumeSkills
 * @param {number} resumeExperience
 * @param {Partial<ScoringConfig> & { scoringConfig?: Partial<ScoringConfig> }} [options]
 */
export function calculateMatchScore(job, resumeSkills, resumeExperience, options = {}) {
  const config = createScoringConfig(options.scoringConfig || options);
  let score = 0;
  let maxScore = 0;
  const matchDetails = {
    skillMatches: [],
    experienceMatch: false,
    locationMatch: false,
    bonusPoints: [],
  };
  const jobText = buildJobText(job);

  for (const scorePart of [
    scoreSkills(jobText, resumeSkills, matchDetails, config),
    scoreExperience(job, resumeExperience, matchDetails, config),
    scoreLocation(job, matchDetails, config),
    scoreBonus(job, jobText, matchDetails, config),
  ]) {
    score += scorePart.score;
    maxScore += scorePart.maxScore;
  }

  return {
    score: Math.round(score),
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    details: matchDetails,
  };
}

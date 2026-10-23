/**
 * Multi-factor weighted match scoring for job listings.
 *
 * Scoring breakdown (max 100):
 *   Base:               5 pts
 *   Skills match:      40 pts (share of the configured skills mentioned; a Korean
 *                      synonym such as 자동화 counts as its skill, see skill-synonyms.js)
 *   Preferred company: 20 pts
 *   Experience fit:    15 pts (exact fit) or 10 pts (near fit)
 *   Location match:    10 pts
 *   Freshness:         10 pts (≤3d) / 7 (≤7d) / 5 (≤14d) / 2 (older)
 *
 * Excluded companies, excluded title keywords and, when excludeDegreeRequired is set,
 * postings that require a bachelor's degree return 0 immediately.
 */

import { skillTermGroups } from './skill-synonyms.js';

/**
 * Normalize a skill name for comparison.
 * Strips dots, lowercases, and resolves common aliases.
 * @param {string} skill
 * @returns {string}
 */
export function normalizeSkillName(skill) {
  const normalized = String(skill || '')
    .toLowerCase()
    .replace(/\./g, '')
    .trim();

  /** @type {Record<string, string>} */
  const aliases = {
    reactjs: 'react',
    vuejs: 'vue',
    nextjs: 'nextjs',
    nodejs: 'nodejs',
    expressjs: 'express',
    ts: 'typescript',
    js: 'javascript',
  };

  return aliases[normalized] || normalized;
}

/**
 * @typedef {Object} ScorableJob
 * @property {string} [company]
 * @property {string} [position]
 * @property {string} [description]
 * @property {string | number} [experience]
 * @property {string} [location]
 * @property {string | number | Date} [postedAt]
 */

/**
 * @typedef {Object} MatchScoringConfig
 * @property {readonly string[]} [skills]
 * @property {readonly string[]} [preferredCompanies]
 * @property {readonly string[]} [excludeCompanies]
 * @property {readonly string[]} [excludeTitleKeywords] title terms of roles not to apply for
 * @property {boolean} [excludeDegreeRequired] skip postings that require a bachelor's degree
 * @property {number} [experienceYears]
 * @property {readonly string[]} [preferredLocations]
 */

/**
 * Calculate a weighted match score for a job listing.
 * @param {ScorableJob} job - Job listing with position, company, description, etc.
 * @param {MatchScoringConfig} config - Scoring configuration
 * @returns {number} Score 0-100
 */
export function calculateMatchScore(job, config) {
  const company = (job.company || '').toLowerCase();

  // Excluded companies get zero immediately
  if (
    config.excludeCompanies?.some((excluded) =>
      company.includes(String(excluded || '').toLowerCase())
    )
  ) {
    return 0;
  }
  if (hasExcludedTitle(job.position, config.excludeTitleKeywords)) return 0;
  if (
    config.excludeDegreeRequired &&
    requiresDegree(`${job.position || ''} ${job.description || ''}`)
  ) {
    return 0;
  }

  let score = 5;

  // --- Skills match (up to 40 pts) ---
  const textForMatching = `${job.position || ''} ${job.description || ''}`;
  const normalizedText = normalizeSkillName(textForMatching).replace(/\s+/g, ' ');

  const requiredSkills = Array.isArray(config.skills) ? config.skills : [];
  const skillGroups = skillTermGroups(
    requiredSkills.map((skill) => normalizeSkillName(skill)).filter(Boolean)
  );
  if (skillGroups.length > 0) {
    const matchedGroups = skillGroups.filter((terms) =>
      terms.some((term) => mentionsTerm(normalizedText, term))
    );
    score += (matchedGroups.length / skillGroups.length) * 40;
  }

  // --- Preferred companies (20 pts) ---
  if (
    config.preferredCompanies?.some((preferred) =>
      company.includes(String(preferred || '').toLowerCase())
    )
  ) {
    score += 20;
  }

  // --- Experience fit (up to 15 pts) ---
  if (typeof config.experienceYears === 'number' && Number.isFinite(config.experienceYears)) {
    const experienceText = `${job.position || ''} ${job.description || ''} ${job.experience || ''}`;
    const rangeMatch = experienceText.match(
      /(\d+)\s*(?:\+?\s*)?(?:-|~|–|to)\s*(\d+)\s*(?:years?|yrs?|yr|년)/i
    );
    const plusMatch =
      experienceText.match(/(\d+)\s*\+\s*(?:years?|yrs?|yr|년)/i) ||
      experienceText.match(/(\d+)\s*(?:years?|yrs?|yr|년)\s*(?:\+|and up|이상)/i);
    const exactMatch = experienceText.match(/(\d+)\s*(?:years?|yrs?|yr|년)/i);

    let minYears = null;
    let maxYears = null;

    if (rangeMatch) {
      const first = Number(rangeMatch[1]);
      const second = Number(rangeMatch[2]);
      minYears = Math.min(first, second);
      maxYears = Math.max(first, second);
    } else if (plusMatch) {
      minYears = Number(plusMatch[1]);
      maxYears = Number.POSITIVE_INFINITY;
    } else if (exactMatch) {
      const exact = Number(exactMatch[1]);
      minYears = exact;
      maxYears = exact;
    }

    if (minYears !== null && maxYears !== null) {
      const years = config.experienceYears;
      const exactFit = years >= minYears && years <= maxYears;
      const nearFit = years >= minYears - 2 && years <= maxYears + 2;

      if (exactFit) {
        score += 15;
      } else if (nearFit) {
        score += 10;
      }
    }
  }

  // --- Location match (10 pts) ---
  if (Array.isArray(config.preferredLocations) && config.preferredLocations.length > 0) {
    const location = (job.location || '').toLowerCase();
    if (
      config.preferredLocations.some((preferredLocation) =>
        location.includes(String(preferredLocation || '').toLowerCase())
      )
    ) {
      score += 10;
    }
  }

  // --- Freshness (up to 10 pts) ---
  const postedDate = job.postedAt ? new Date(job.postedAt) : null;
  const isValidPostedDate = postedDate && !Number.isNaN(postedDate.getTime());
  if (isValidPostedDate) {
    const ageInDays = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays <= 3) {
      score += 10;
    } else if (ageInDays <= 7) {
      score += 7;
    } else if (ageInDays <= 14) {
      score += 5;
    } else {
      score += 2;
    }
  } else {
    score += 2;
  }

  return Math.min(100, Math.round(score));
}

/**
 * @param {string | undefined} position
 * @param {readonly string[] | undefined} keywords
 * @returns {boolean}
 */
function hasExcludedTitle(position, keywords) {
  if (!keywords?.length) return false;
  const title = normalizeSkillName(position || '').replace(/\s+/g, ' ');
  return keywords.some((keyword) => mentionsTerm(title, normalizeSkillName(keyword)));
}

const DEGREE_REQUIRED =
  /(학사|대졸)[^.\n]{0,12}(이상|필수|소지)|(4년제|대학교?)\s*(대학교?\s*)?졸업\s*(자|이상|필수)|bachelor'?s?\s+degree/i;
const DEGREE_WAIVED =
  /학력\s*무관|학력\s*제한\s*없|동등|준하는|or\s+equivalent|(이상|학위|소지자?|졸업자?)\s*우대/i;

/**
 * A bachelor's-degree requirement, unless the text waives it (학력무관, 동등 경력, 우대 only).
 * @param {string} text posting title and description
 * @returns {boolean}
 */
export function requiresDegree(text) {
  return DEGREE_REQUIRED.test(text) && !DEGREE_WAIVED.test(text);
}

/**
 * @param {string} text normalized posting text
 * @param {string} term normalized skill term
 * @returns {boolean}
 */
function mentionsTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

/**
 * Multi-factor weighted match scoring for job listings.
 *
 * Scoring breakdown (max 100):
 *   Base:               5 pts
 *   Skills match:      40 pts (proportional to matched/total)
 *   Preferred company: 20 pts
 *   Experience fit:    15 pts (exact fit) or 10 pts (near fit)
 *   Location match:    10 pts
 *   Freshness:         10 pts (≤3d) / 7 (≤7d) / 5 (≤14d) / 2 (older)
 *
 * Excluded companies return 0 immediately.
 */

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

  const aliases = {
    reactjs: 'react',
    vuejs: 'vue',
    nextjs: 'nextjs',
    'nodejs': 'nodejs',
    'expressjs': 'express',
    ts: 'typescript',
    js: 'javascript',
  };

  return aliases[normalized] || normalized;
}

/**
 * Calculate a weighted match score for a job listing.
 * @param {Object} job - Job listing with position, company, description, etc.
 * @param {Object} config - Scoring configuration
 * @param {string[]} [config.skills] - Required skills to match
 * @param {string[]} [config.preferredCompanies] - Preferred company names
 * @param {string[]} [config.excludeCompanies] - Companies to exclude (returns 0)
 * @param {number} [config.experienceYears] - User's years of experience
 * @param {string[]} [config.preferredLocations] - Preferred job locations
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

  let score = 5;

  // --- Skills match (up to 40 pts) ---
  const textForMatching = `${job.position || ''} ${job.description || ''}`;
  const normalizedText = normalizeSkillName(textForMatching).replace(/\s+/g, ' ');

  const requiredSkills = Array.isArray(config.skills) ? config.skills : [];
  if (requiredSkills.length > 0) {
    const matchedSkills = requiredSkills.filter((skill) => {
      const normalizedSkill = normalizeSkillName(skill);
      if (!normalizedSkill) return false;

      const escaped = normalizedSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      return pattern.test(normalizedText);
    });

    score += (matchedSkills.length / requiredSkills.length) * 40;
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

import { SKILL_CATEGORIES } from './skill-categories.js';

const PREFERRED_LOCATIONS = ['서울', 'seoul', '판교', 'pangyo', '성남'];
const TOP_COMPANIES = [
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
];

function buildJobText(job) {
  return `${job.position || ''} ${job.description || ''} ${job.requirements || ''} ${job.techStack || ''}`.toLowerCase();
}

function scoreSkills(jobText, resumeSkills, matchDetails) {
  let score = 0;
  let maxScore = 0;

  for (const [category, skillData] of resumeSkills) {
    const categoryConfig = SKILL_CATEGORIES[category];
    let categoryMatches = 0;

    for (const keyword of skillData.keywords) {
      if (jobText.includes(keyword.toLowerCase())) {
        categoryMatches++;
        matchDetails.skillMatches.push({ category, keyword });
      }
    }

    if (categoryMatches > 0) {
      score += Math.min(categoryMatches * 5 * categoryConfig.weight, 15);
    }
    maxScore += 15;
  }

  return { score, maxScore };
}

function scoreExperience(job, resumeExperience, matchDetails) {
  const jobExpMin = job.experienceMin || job.annual_from || 0;
  const jobExpMax = job.experienceMax || job.annual_to || 99;

  if (resumeExperience >= jobExpMin && resumeExperience <= jobExpMax + 3) {
    matchDetails.experienceMatch = true;
    return { score: 20, maxScore: 20 };
  }
  if (resumeExperience >= jobExpMin - 2) {
    return { score: 10, maxScore: 20 };
  }

  return { score: 0, maxScore: 20 };
}

function scoreLocation(job, matchDetails) {
  const jobLocation = (job.location || '').toLowerCase();
  if (PREFERRED_LOCATIONS.some((loc) => jobLocation.includes(loc))) {
    matchDetails.locationMatch = true;
    return { score: 10, maxScore: 10 };
  }

  return { score: 0, maxScore: 10 };
}

function scoreBonus(job, jobText, matchDetails) {
  let score = 0;

  if (jobText.includes('금융') || jobText.includes('finance') || jobText.includes('fintech')) {
    score += 5;
    matchDetails.bonusPoints.push('금융권 경험 매칭');
  }

  if (jobText.includes('ai') || jobText.includes('자동화') || jobText.includes('automation')) {
    score += 3;
    matchDetails.bonusPoints.push('AI/자동화 경험 매칭');
  }

  if (TOP_COMPANIES.some((company) => (job.company || '').toLowerCase().includes(company))) {
    score += 2;
    matchDetails.bonusPoints.push('주요 기업');
  }

  return { score, maxScore: 10 };
}

export function calculateMatchScore(job, resumeSkills, resumeExperience) {
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
    scoreSkills(jobText, resumeSkills, matchDetails),
    scoreExperience(job, resumeExperience, matchDetails),
    scoreLocation(job, matchDetails),
    scoreBonus(job, jobText, matchDetails),
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

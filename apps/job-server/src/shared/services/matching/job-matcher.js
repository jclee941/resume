import { readFileSync, existsSync } from 'fs';
import { getResumeMasterMarkdownPath } from '../../utils/paths.js';

const SKILL_CATEGORIES = {
  security: {
    keywords: [
      '보안',
      'security',
      'firewall',
      'fortigate',
      'waf',
      'ips',
      'ids',
      'siem',
      'splunk',
      'ddos',
      'nac',
      'dlp',
      'edr',
      'apt',
      'isms',
      'iso27001',
      'cissp',
      'cism',
      'penetration',
      'vulnerability',
    ],
    weight: 1.5,
  },
  infrastructure: {
    keywords: [
      '인프라',
      'infrastructure',
      'linux',
      'server',
      'network',
      'aws',
      'azure',
      'gcp',
      'cloud',
      'docker',
      'kubernetes',
      'k8s',
      'vmware',
      'terraform',
      'ansible',
    ],
    weight: 1.3,
  },
  devops: {
    keywords: [
      'devops',
      'ci/cd',
      'jenkins',
      'gitlab',
      'github actions',
      'argocd',
      'helm',
      'prometheus',
      'grafana',
      'loki',
      'monitoring',
    ],
    weight: 1.2,
  },
  automation: {
    keywords: ['자동화', 'automation', 'python', 'shell', 'bash', 'powershell', 'scripting', 'api'],
    weight: 1.1,
  },
  ai_ml: {
    keywords: ['ai', 'ml', 'machine learning', 'claude', 'gpt', 'llm', 'mcp', 'langchain'],
    weight: 1.4,
  },
  finance: {
    keywords: [
      '금융',
      'finance',
      'fintech',
      'fsc',
      '금융감독원',
      '금융위원회',
      '증권',
      '거래소',
      '투자',
    ],
    weight: 1.3,
  },
};

export function loadResume(resumePath) {
  const defaultPath = getResumeMasterMarkdownPath();
  const path = resumePath || defaultPath;

  if (!existsSync(path)) {
    throw new Error(`Resume not found: ${path}`);
  }

  return readFileSync(path, 'utf-8');
}

export function extractSkills(resumeText) {
  const skills = new Map();
  const lowerText = resumeText.toLowerCase();

  for (const [category, config] of Object.entries(SKILL_CATEGORIES)) {
    const found = [];
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }
    if (found.length > 0) {
      skills.set(category, {
        keywords: found,
        weight: config.weight,
        count: found.length,
      });
    }
  }

  return skills;
}

export function extractExperience(resumeText) {
  const match = resumeText.match(/총\s*경력[:\s]*(\d+)년\s*(\d+)?개월?/);
  if (match) {
    const years = parseInt(match[1], 10);
    const months = parseInt(match[2] || '0', 10);
    return years + months / 12;
  }

  const engMatch = resumeText.match(/(\d+)\+?\s*years?\s*(of\s*)?experience/i);
  if (engMatch) {
    return parseInt(engMatch[1], 10);
  }

  return 8;
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

  const jobText =
    `${job.position || ''} ${job.description || ''} ${job.requirements || ''} ${job.techStack || ''}`.toLowerCase();

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
      const categoryScore = Math.min(categoryMatches * 5 * categoryConfig.weight, 15);
      score += categoryScore;
    }
    maxScore += 15;
  }

  const jobExpMin = job.experienceMin || job.annual_from || 0;
  const jobExpMax = job.experienceMax || job.annual_to || 99;

  if (resumeExperience >= jobExpMin && resumeExperience <= jobExpMax + 3) {
    score += 20;
    matchDetails.experienceMatch = true;
  } else if (resumeExperience >= jobExpMin - 2) {
    score += 10;
  }
  maxScore += 20;

  const preferredLocations = ['서울', 'seoul', '판교', 'pangyo', '성남'];
  const jobLocation = (job.location || '').toLowerCase();
  if (preferredLocations.some((loc) => jobLocation.includes(loc))) {
    score += 10;
    matchDetails.locationMatch = true;
  }
  maxScore += 10;

  if (jobText.includes('금융') || jobText.includes('finance') || jobText.includes('fintech')) {
    score += 5;
    matchDetails.bonusPoints.push('금융권 경험 매칭');
  }

  if (jobText.includes('ai') || jobText.includes('자동화') || jobText.includes('automation')) {
    score += 3;
    matchDetails.bonusPoints.push('AI/자동화 경험 매칭');
  }

  const topCompanies = [
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
  if (topCompanies.some((c) => (job.company || '').toLowerCase().includes(c))) {
    score += 2;
    matchDetails.bonusPoints.push('주요 기업');
  }
  maxScore += 10;

  return {
    score: Math.round(score),
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    details: matchDetails,
  };
}

export function filterAndRankJobs(jobs, options = {}) {
  const { resumePath, minScore = 50, maxResults = 20, excludeCompanies = [] } = options;

  const resumeText = loadResume(resumePath);
  const resumeSkills = extractSkills(resumeText);
  const resumeExperience = extractExperience(resumeText);

  const scoredJobs = jobs
    .filter(
      (job) =>
        !excludeCompanies.some((c) => (job.company || '').toLowerCase().includes(c.toLowerCase()))
    )
    .map((job) => {
      const match = calculateMatchScore(job, resumeSkills, resumeExperience);
      return {
        ...job,
        matchScore: match.score,
        matchPercentage: match.percentage,
        matchDetails: match.details,
      };
    })
    .filter((job) => job.matchPercentage >= minScore)
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, maxResults);

  return {
    jobs: scoredJobs,
    resumeAnalysis: {
      experience: resumeExperience,
      skillCategories: Array.from(resumeSkills.keys()),
      totalSkills: Array.from(resumeSkills.values()).reduce((sum, s) => sum + s.count, 0),
    },
  };
}

export function prioritizeApplications(scoredJobs) {
  return scoredJobs.map((job, index) => {
    let priority = 'low';
    const reason = [];

    if (job.matchPercentage >= 85) {
      priority = 'high';
      reason.push('높은 매칭률');
    } else if (job.matchPercentage >= 70) {
      priority = 'medium';
      reason.push('적정 매칭률');
    }

    if (job.due_date) {
      const dueDate = new Date(job.due_date);
      const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7 && daysLeft > 0) {
        priority = 'high';
        reason.push(`마감 ${daysLeft}일 남음`);
      }
    }

    if (job.matchDetails?.bonusPoints?.includes('주요 기업')) {
      if (priority !== 'high') priority = 'medium';
      reason.push('주요 기업');
    }

    return {
      ...job,
      applicationPriority: priority,
      priorityReason: reason,
      rank: index + 1,
    };
  });
}

export default {
  loadResume,
  extractSkills,
  extractExperience,
  calculateMatchScore,
  filterAndRankJobs,
  prioritizeApplications,
};

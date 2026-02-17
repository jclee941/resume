import * as fsPromises from 'fs/promises';
import { getResumeMasterDataPath } from '../shared/utils/paths.js';

const COMMON_STOPWORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'have',
  'will',
  'your',
  'you',
  'our',
  'job',
  'role',
  'team',
  'work',
  'years',
  'year',
  '경력',
  '경험',
  '업무',
  '및',
  '에서',
]);

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTokens(value) {
  return normalize(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !COMMON_STOPWORDS.has(token));
}

function unique(list) {
  return [...new Set(list)];
}

function parseRequirements(requirements) {
  return Array.isArray(requirements) ? requirements.join(' ') : String(requirements || '');
}

function jaccardSimilarity(leftTokens, rightTokens) {
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function parseExperienceYears(value) {
  const text = String(value || '');
  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*[-~]\s*(\d+(?:\.\d+)?)\s*년/);
  if (rangeMatch) {
    return {
      min: Number(rangeMatch[1]),
      max: Number(rangeMatch[2]),
      unrestricted: false,
    };
  }

  if (/경력\s*무관|무관/.test(text)) {
    return { min: 0, max: 99, unrestricted: true };
  }

  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*년\s*이상/);
  if (minMatch) {
    const min = Number(minMatch[1]);
    return { min, max: Math.max(min + 5, min), unrestricted: false };
  }

  const singleMatch = text.match(/(\d+(?:\.\d+)?)\s*년/);
  if (singleMatch) {
    const years = Number(singleMatch[1]);
    return { min: years, max: Math.max(years + 3, years), unrestricted: false };
  }

  return { min: 0, max: 99, unrestricted: true };
}

function getResumeYears(resumeData) {
  const totalExperience = String(resumeData.summary?.totalExperience || '');
  const match = totalExperience.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return Number(match[1]);
  }

  const careerCount = Array.isArray(resumeData.careers) ? resumeData.careers.length : 0;
  return Math.max(careerCount, 0);
}

function scoreExperienceLevel(jobText, resumeYears) {
  const parsed = parseExperienceYears(jobText);
  if (parsed.unrestricted) {
    return { score: 100, range: parsed };
  }

  if (resumeYears >= parsed.min && resumeYears <= parsed.max) {
    return { score: 100, range: parsed };
  }

  if (resumeYears > parsed.max) {
    return { score: 85, range: parsed };
  }

  const gap = parsed.min - resumeYears;
  if (gap <= 1) {
    return { score: 70, range: parsed };
  }
  if (gap <= 3) {
    return { score: 45, range: parsed };
  }
  return { score: 20, range: parsed };
}

function getCity(location) {
  const normalized = normalize(location);
  if (!normalized) {
    return '';
  }
  const [first] = normalized.split(' ');
  return first || '';
}

function scoreLocation(jobListing, resumeData) {
  const jobLocation = String(jobListing.location || '');
  const resumeLocation = String(resumeData.personal?.address || '');

  const normalizedJob = normalize(jobLocation);
  const normalizedResume = normalize(resumeLocation);
  const remoteText = normalize(
    [
      jobListing.title || '',
      jobListing.description || '',
      parseRequirements(jobListing.requirements),
      jobLocation,
    ].join(' ')
  );

  if (normalizedJob && normalizedResume && normalizedJob === normalizedResume) {
    return { score: 100, reason: 'perfect_match' };
  }

  const jobCity = getCity(jobLocation);
  const resumeCity = getCity(resumeLocation);
  if (jobCity && resumeCity && jobCity === resumeCity) {
    return { score: 80, reason: 'same_city' };
  }

  if (/remote|원격|재택|hybrid|하이브리드/.test(remoteText)) {
    return { score: 70, reason: 'remote_ok' };
  }

  return { score: 30, reason: 'different_city' };
}

function buildKeywordSetFromListing(jobListing) {
  return unique(
    toTokens(
      [
        jobListing.title || '',
        parseRequirements(jobListing.requirements),
        jobListing.description || '',
        jobListing.company || '',
      ].join(' ')
    )
  );
}

function collectResumeSkills(resumeData) {
  return Object.values(resumeData.skills || {}).flatMap((group) =>
    (group.items || []).map((item) => item.name)
  );
}

function extractSkillCandidates(text) {
  return unique(
    String(text || '')
      .split(/[\n,;|/]+/)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length >= 2)
      .flatMap((segment) => {
        const tokens = toTokens(segment);
        if (tokens.length === 0) {
          return [];
        }

        const asPhrase = tokens.slice(0, 4).join(' ');
        if (asPhrase.length >= 2) {
          return [asPhrase];
        }
        return tokens;
      })
  );
}

function scoreTechnicalSkills(resumeSkills, jobListing) {
  const jobText = [
    jobListing.title || '',
    parseRequirements(jobListing.requirements),
    jobListing.description || '',
  ].join(' ');
  const requiredSkills = extractSkillCandidates(jobText).slice(0, 30);

  if (requiredSkills.length === 0) {
    return {
      score: 0,
      matchedSkills: [],
      matchedKeywords: [],
      gapKeywords: [],
      requiredSkills: [],
      hasHardSkillGap: false,
    };
  }

  const resumeSkillTokens = resumeSkills.map((skill) => ({
    skill,
    tokens: toTokens(skill),
  }));

  const matchedSkills = [];
  const matchedKeywords = new Set();
  const gapKeywords = [];
  let totalSimilarity = 0;
  let matchedRequirementCount = 0;

  for (const requiredSkill of requiredSkills) {
    const requiredTokens = toTokens(requiredSkill);
    let best = { score: 0, skill: '' };

    for (const resumeSkill of resumeSkillTokens) {
      const score = jaccardSimilarity(requiredTokens, resumeSkill.tokens);
      if (score > best.score) {
        best = { score, skill: resumeSkill.skill };
      }
    }

    totalSimilarity += best.score;

    if (best.score >= 0.25) {
      matchedRequirementCount += 1;
      matchedSkills.push(best.skill);
      requiredTokens.forEach((token) => {
        matchedKeywords.add(token);
      });
    } else {
      gapKeywords.push(requiredSkill);
    }
  }

  const averageSimilarity = totalSimilarity / requiredSkills.length;
  const score = Math.round(Math.max(0, Math.min(100, averageSimilarity * 100)));

  return {
    score,
    matchedSkills: unique(matchedSkills).slice(0, 15),
    matchedKeywords: [...matchedKeywords],
    gapKeywords: gapKeywords.slice(0, 20),
    requiredSkills,
    hasHardSkillGap: requiredSkills.length > 0 && matchedRequirementCount === 0,
  };
}

function scoreCompanyCulture(jobListing, resumeData) {
  const cultureKeywords = [
    '협업',
    '소통',
    'ownership',
    '오너십',
    '문제해결',
    'problem solving',
    'agile',
    '자율',
    '주도',
    '책임감',
    'teamwork',
    'mentoring',
  ];

  const jobTokens = toTokens(
    [
      jobListing.culture || '',
      jobListing.description || '',
      parseRequirements(jobListing.requirements),
    ].join(' ')
  ).filter((token) => cultureKeywords.some((keyword) => token.includes(normalize(keyword))));

  if (jobTokens.length === 0) {
    return 60;
  }

  const resumeTokens = toTokens(
    [
      resumeData.summary?.profileStatement || '',
      ...(resumeData.careers || []).map((career) => career.description || ''),
    ].join(' ')
  );

  return Math.round(jaccardSimilarity(jobTokens, resumeTokens) * 100);
}

function scoreBenefits(jobListing) {
  const benefitsText = normalize(
    [
      jobListing.benefits || '',
      jobListing.description || '',
      parseRequirements(jobListing.requirements),
    ].join(' ')
  );

  if (!benefitsText) {
    return 40;
  }

  const benefitKeywords = [
    'remote',
    '원격',
    '재택',
    'hybrid',
    '유연근무',
    '교육',
    '성장',
    '복지',
    '휴가',
    '건강검진',
    '스톡옵션',
    '인센티브',
  ];

  const matched = benefitKeywords.filter((keyword) =>
    benefitsText.includes(normalize(keyword))
  ).length;
  return Math.min(100, 40 + matched * 12);
}

function buildRecommendations(score, gapKeywords, matchedSkills, detailedScore) {
  const recommendations = [];

  if (gapKeywords.length > 0) {
    recommendations.push(
      'Add quantified experience bullets that include these keywords: ' +
        gapKeywords.slice(0, 8).join(', ')
    );
  }

  if (matchedSkills.length < 5) {
    recommendations.push(
      'Highlight more relevant tools from existing projects and observability/security automation work.'
    );
  }

  if (detailedScore.experienceLevel < 70) {
    recommendations.push(
      'Clarify experience scope and seniority alignment in your summary and top projects.'
    );
  }

  if (detailedScore.location < 70) {
    recommendations.push('Address work location flexibility or relocation preference explicitly.');
  }

  if (score < 70) {
    recommendations.push(
      'Tailor profile summary to align title and domain terms from this listing.'
    );
  }

  return recommendations;
}

export const jobMatcherTool = {
  name: 'wanted_job_matcher',
  description:
    'Score match between a job listing and resume_data.json. Returns score (0-100), matched skills, gaps, and recommendations.',

  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Job title',
      },
      company: {
        type: 'string',
        description: 'Company name',
      },
      requirements: {
        oneOf: [
          { type: 'string' },
          {
            type: 'array',
            items: { type: 'string' },
          },
        ],
        description: 'Job requirements text or requirement lines',
      },
      description: {
        type: 'string',
        description: 'Full job description text',
      },
    },
    required: ['title', 'requirements', 'description'],
  },

  async execute(params) {
    try {
      const readFile =
        typeof params.__readFile === 'function' ? params.__readFile : fsPromises.readFile;
      const listingKeywords = buildKeywordSetFromListing(params);
      const resumeDataRaw = await readFile(getResumeMasterDataPath(), 'utf-8');
      const resumeData = JSON.parse(resumeDataRaw);

      const resumeSkills = collectResumeSkills(resumeData);
      const technical = scoreTechnicalSkills(resumeSkills, params);
      const resumeYears = getResumeYears(resumeData);
      const experience = scoreExperienceLevel(
        [
          params.experience || '',
          parseRequirements(params.requirements),
          params.description || '',
        ].join(' '),
        resumeYears
      );
      const location = scoreLocation(params, resumeData);
      const companyCulture = scoreCompanyCulture(params, resumeData);
      const benefits = scoreBenefits(params);

      const weightedScore =
        technical.score * 0.4 +
        experience.score * 0.25 +
        location.score * 0.15 +
        companyCulture * 0.1 +
        benefits * 0.1;

      const cappedScore = technical.hasHardSkillGap ? Math.min(40, weightedScore) : weightedScore;
      const score = Math.max(0, Math.min(100, Math.round(cappedScore)));

      const matchedKeywordSet = new Set(technical.matchedKeywords);
      const fallbackGaps = listingKeywords
        .filter((keyword) => !matchedKeywordSet.has(keyword))
        .slice(0, 20);
      const gapKeywords = technical.gapKeywords.length > 0 ? technical.gapKeywords : fallbackGaps;

      const detailedScore = {
        technicalSkills: technical.score,
        experienceLevel: experience.score,
        location: location.score,
        companyCulture,
        benefits,
        weightedScore: Math.round(weightedScore),
        finalScore: score,
        capApplied: technical.hasHardSkillGap,
      };

      const recommendations = buildRecommendations(
        score,
        gapKeywords,
        technical.matchedSkills,
        detailedScore
      );

      return {
        success: true,
        match: {
          score,
          matched_skills: technical.matchedSkills,
          matched_keywords: [...matchedKeywordSet],
          gaps: gapKeywords,
          recommendations,
          detailedScore,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default jobMatcherTool;

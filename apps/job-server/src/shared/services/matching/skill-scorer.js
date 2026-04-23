import { normalize, parseRequirements, toTokens, unique } from './text-utils.js';

export const SKILL_ALIASES = {
  devsecops: ['devsecops', 'security devops', 'devops security'],
  sre: ['sre', 'site reliability', 'site reliability engineering'],
  iac: ['iac', 'infrastructure as code'],
  kubernetes: ['kubernetes', 'k8s'],
  'splunk es': ['splunk es', 'splunk enterprise security'],
  'ci/cd': ['ci/cd', 'ci cd', 'cicd'],
  observability: ['observability', 'monitoring'],
};

export const DOMAIN_SKILL_PATTERN =
  /(보안|security|devsecops|devops|sre|infra|infrastructure|cloud|aws|docker|kubernetes|terraform|ansible|prometheus|grafana|fortigate|splunk|siem|iac|ci\/cd|cicd|isms|iso ?27001)/;

export function normalizeSkillPhrase(value) {
  let text = normalize(value);
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    for (const alias of aliases) {
      text = text.replaceAll(normalize(alias), canonical);
    }
  }
  return text;
}

export function canonicalizeSkill(value) {
  const normalized = normalizeSkillPhrase(value);
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (
      canonical === normalized ||
      aliases.some((alias) => normalizeSkillPhrase(alias) === normalized)
    ) {
      return canonical;
    }
  }
  return normalized;
}

export function getSkillWeight(skill) {
  return DOMAIN_SKILL_PATTERN.test(skill) ? 1.5 : 1;
}

export function extractSkillCandidates(text) {
  const segments = normalizeSkillPhrase(text).split(/[\n,;|]+/);
  const candidates = new Set();
  for (const segment of segments) {
    const tokens = toTokens(segment);
    if (tokens.length === 0) continue;
    for (let size = Math.min(4, tokens.length); size >= 1; size -= 1) {
      for (let index = 0; index <= tokens.length - size; index += 1) {
        const phrase = canonicalizeSkill(tokens.slice(index, index + size).join(' '));
        if (
          phrase.length >= 2 &&
          (size === 1 || DOMAIN_SKILL_PATTERN.test(phrase) || phrase.includes(' '))
        ) {
          candidates.add(phrase);
        }
      }
    }
  }
  return [...candidates];
}

export function scoreTechnicalSkills(resumeSkills, jobListing) {
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
    canonical: canonicalizeSkill(skill),
    tokens: toTokens(skill),
  }));

  const matchedSkills = [];
  const matchedKeywords = new Set();
  const gapKeywords = [];
  let matchedWeight = 0;
  let totalWeight = 0;
  let exactMatchCount = 0;
  let matchedRequirementCount = 0;

  for (const requiredSkill of requiredSkills) {
    const canonicalRequired = canonicalizeSkill(requiredSkill);
    const requiredTokens = toTokens(canonicalRequired);
    const requiredWeight = getSkillWeight(canonicalRequired);
    let best = { coverage: 0, skill: '', exact: false };
    totalWeight += requiredWeight;

    for (const resumeSkill of resumeSkillTokens) {
      const overlap = requiredTokens.filter((token) => resumeSkill.tokens.includes(token)).length;
      const exact =
        resumeSkill.canonical === canonicalRequired ||
        resumeSkill.canonical.includes(canonicalRequired) ||
        canonicalRequired.includes(resumeSkill.canonical);
      const coverage = exact
        ? 1
        : requiredTokens.length === 0
          ? 0
          : overlap / requiredTokens.length;
      if (coverage > best.coverage) {
        best = { coverage, skill: resumeSkill.skill, exact };
      }
    }

    if (best.coverage >= 0.5) {
      matchedRequirementCount += 1;
      matchedWeight += requiredWeight * best.coverage;
      matchedSkills.push(best.skill);
      if (best.exact) exactMatchCount += 1;
      requiredTokens.forEach((token) => {
        matchedKeywords.add(token);
      });
    } else {
      gapKeywords.push(canonicalRequired);
    }
  }

  const coverageScore = totalWeight === 0 ? 0 : (matchedWeight / totalWeight) * 100;
  const exactBonus =
    requiredSkills.length === 0 ? 0 : (exactMatchCount / requiredSkills.length) * 15;
  const score = Math.round(Math.max(0, Math.min(100, coverageScore + exactBonus)));

  return {
    score,
    matchedSkills: unique(matchedSkills).slice(0, 15),
    matchedKeywords: [...matchedKeywords],
    gapKeywords: gapKeywords.slice(0, 20),
    requiredSkills,
    hasHardSkillGap: requiredSkills.length > 0 && matchedRequirementCount === 0,
  };
}

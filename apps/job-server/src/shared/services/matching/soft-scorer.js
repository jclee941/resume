import { jaccardSimilarity, normalize, parseRequirements, toTokens } from './text-utils.js';

export function scoreCompanyCulture(jobListing, resumeData) {
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

export function scoreBenefits(jobListing) {
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

  const matched = benefitKeywords.filter((keyword) => benefitsText.includes(normalize(keyword))).length;
  return Math.min(100, 40 + matched * 12);
}

export function buildRecommendations(score, gapKeywords, matchedSkills, detailedScore) {
  const recommendations = [];

  if (gapKeywords.length > 0) {
    recommendations.push(
      `Add quantified experience bullets that include these keywords: ${gapKeywords
        .slice(0, 8)
        .join(', ')}`
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
    recommendations.push('Tailor profile summary to align title and domain terms from this listing.');
  }

  return recommendations;
}

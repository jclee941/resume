export const DEFAULT_EXCLUDE_KEYWORDS = Object.freeze([
  '팀장',
  '팀 리드',
  '테크 리드',
  '기술 리드',
  '보안 리드',
  '조직장',
  '파트장',
  '본부장',
  '실장',
  '매니저',
  'lead security',
  'lead engineer',
  'security lead',
  'security manager',
  'team lead',
  'team manager',
  'tech lead',
  'technical lead',
  'engineering lead',
  'engineering manager',
  'head of',
  'people manager',
]);

export function createFilterConfig(config = {}) {
  return {
    reviewThreshold: config.reviewThreshold || 60,
    autoApplyThreshold: config.autoApplyThreshold || 75,
    minMatchScore: config.minMatchScore || config.reviewThreshold || 60,
    excludeCompanies: config.excludeCompanies || [],
    preferredCompanies: config.preferredCompanies || [],
    keywords: config.keywords || [],
    platformPriority: config.platformPriority || ['wanted', 'saramin', 'jobkorea'],
    aiBatchSize: config.aiBatchSize || 5,
    aiCacheTtl: config.aiCacheTtl || 24,
    aiMinConfidence: config.aiMinConfidence || 0.7,
    ...config,
    excludeKeywords: [...DEFAULT_EXCLUDE_KEYWORDS, ...(config.excludeKeywords || [])],
  };
}

export function createScoringStats() {
  return {
    totalScored: 0,
    heuristicScored: 0,
    hybridScored: 0,
    aiCalls: 0,
    aiJobsRequested: 0,
    aiFailures: 0,
    aiFallbacks: 0,
    aiLowConfidenceSkips: 0,
    aiSkippedLowHeuristic: 0,
    cacheHits: 0,
    cacheMisses: 0,
    batchesProcessed: 0,
    cacheInvalidations: 0,
  };
}

export function generateJobKey(job) {
  const company = (job.company || '').toLowerCase().trim();
  const position = (job.position || '').toLowerCase().trim();
  return `${company}:${position}`;
}

export function deduplicateJobs(jobs, existingJobIds) {
  const seen = new Set(existingJobIds);
  const result = [];

  for (const job of jobs) {
    const key = generateJobKey(job);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(job);
    }
  }

  return result;
}

export function matchesExcludeKeywords(job, config) {
  const text = `${job.position} ${job.description || ''}`.toLowerCase();
  return config.excludeKeywords.some((kw) => text.includes(kw.toLowerCase()));
}

export function isExcludedCompany(job, config) {
  const company = (job.company || '').toLowerCase();
  return config.excludeCompanies.some((c) => company.includes(c.toLowerCase()));
}

export function isPreferredCompany(job, config) {
  const company = (job.company || '').toLowerCase();
  return config.preferredCompanies.some((c) => company.includes(c.toLowerCase()));
}

export function applyJobFilters(jobs, config) {
  return jobs.filter((job) => {
    if (matchesExcludeKeywords(job, config)) return false;
    if (isExcludedCompany(job, config)) return false;
    return true;
  });
}

export function sortFilteredJobs(jobs, config) {
  const { reviewThreshold, autoApplyThreshold } = config;

  return jobs
    .filter((job) => job.matchScore >= reviewThreshold)
    .map((job) => ({
      ...job,
      tier: job.matchScore >= autoApplyThreshold ? 'auto-apply' : 'manual-review',
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}

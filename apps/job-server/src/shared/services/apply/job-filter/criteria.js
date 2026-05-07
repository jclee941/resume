export function createFilterConfig(config = {}) {
  return {
    reviewThreshold: config.reviewThreshold || 60,
    autoApplyThreshold: config.autoApplyThreshold || 75,
    minMatchScore: config.minMatchScore || config.reviewThreshold || 60,
    excludeKeywords: config.excludeKeywords || [],
    excludeCompanies: config.excludeCompanies || [],
    preferredCompanies: config.preferredCompanies || [],
    keywords: config.keywords || [],
    platformPriority: config.platformPriority || ['wanted', 'saramin', 'jobkorea'],
    aiBatchSize: config.aiBatchSize || 5,
    aiCacheTtl: config.aiCacheTtl || 24,
    aiMinConfidence: config.aiMinConfidence || 0.7,
    ...config,
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

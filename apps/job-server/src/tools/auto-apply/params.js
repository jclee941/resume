import { UnifiedApplySystem } from '../../shared/services/apply/unified-apply-system.js';

export function validateSearchParams(params, preferences = {}) {
  return {
    keywords: Array.isArray(params.keywords)
      ? params.keywords
      : ['DevOps', 'SRE', '클우드 엔지니어'],
    tag_type_ids: params.tag_type_ids || [674, 672, 665],
    locations: params.locations || 'all',
    years: params.years ?? -1,
    limit: Math.min(params.limit || 50, 100),
    matchScoreThreshold: params.match_score_threshold ?? preferences.matchScoreThreshold ?? 75,
    dry_run: params.dry_run ?? true,
  };
}

export function validateApplyParams(params) {
  if (!params.job_id) {
    throw new Error('job_id is required for apply_to_job action');
  }

  return {
    job_id: params.job_id,
    resume_id: params.resume_id,
    cover_letter: params.cover_letter,
    dry_run: params.dry_run ?? false,
  };
}

export function validatePreferenceParams(params) {
  return {
    match_score_threshold: params.match_score_threshold ?? 75,
    daily_application_limit: params.daily_application_limit ?? 20,
    preferred_platforms: params.preferred_platforms ?? ['wanted'],
    exclude_companies: params.exclude_companies ?? [],
    preferred_companies: params.preferred_companies ?? [],
    keywords: params.keywords ?? ['시니어 엔지니어', '클우드 엔지니어', 'SRE'],
  };
}

export function createApplySystem(preferences) {
  const config = {
    maxDailyApplications: preferences.daily_application_limit,
    autoApplyThreshold: preferences.match_score_threshold,
    reviewThreshold: Math.max(60, preferences.match_score_threshold - 15),
    minMatchScore: preferences.match_score_threshold,
    enabledPlatforms: preferences.preferred_platforms,
    excludeCompanies: preferences.exclude_companies,
    preferredCompanies: preferences.preferred_companies,
    keywords: preferences.keywords,
    useAI: false,
  };

  return new UnifiedApplySystem({
    config,
    logger: console,
  });
}

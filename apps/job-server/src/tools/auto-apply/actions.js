import { SessionManager } from '../auth.js';
import { AUTO_APPLY_ACTIONS } from './constants.js';
import {
  createApplySystem,
  validateApplyParams,
  validatePreferenceParams,
  validateSearchParams,
} from './params.js';

export async function executeAutoApplyAction(params, state) {
  const { action } = params;

  if (action !== 'get_status' && action !== 'set_preferences') {
    const api = await SessionManager.getAPI?.();
    if (!api) {
      return {
        success: false,
        error: 'Not logged in. Use wanted_auth first.',
        hint: 'wanted_auth({ action: "set_cookies", cookies: "..." })',
      };
    }
  }

  try {
    switch (action) {
      case 'search_and_apply':
        return await executeSearchAndApply(params, state);
      case 'apply_to_job':
        return await executeApplyToJob(params, state);
      case 'get_status':
        return executeGetStatus(state);
      case 'set_preferences':
        return executeSetPreferences(params, state);
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
          available_actions: AUTO_APPLY_ACTIONS,
        };
    }
  } catch (error) {
    return {
      success: false,
      action,
      error: error.message,
      stack: error.stack,
    };
  }
}

async function executeSearchAndApply(params, state) {
  const searchParams = validateSearchParams(params, state.preferences);
  const preferences = {
    ...state.preferences,
    match_score_threshold: searchParams.matchScoreThreshold,
  };

  const system = createApplySystem(preferences);

  if (params.match_score_threshold !== undefined) {
    state.preferences.matchScoreThreshold = params.match_score_threshold;
  }

  const result = await system.run({
    keywords: searchParams.keywords,
    dryRun: searchParams.dry_run,
    notify: false,
  });

  state.jobsSearched += result.phases.search.found || 0;
  state.jobsMatched += result.phases.filter?.matched || 0;
  state.jobsApplied += result.phases.apply?.succeeded || 0;
  state.jobsFailed += result.phases.apply?.failed || 0;
  state.lastRunAt = new Date().toISOString();

  if (result.phases.apply?.results) {
    state.applications.push(
      ...result.phases.apply.results.map((entry) => ({
        jobId: entry.job?.id,
        company: entry.job?.company,
        title: entry.job?.title,
        success: entry.success,
        dryRun: entry.dryRun,
        appliedAt: new Date().toISOString(),
      }))
    );
  }

  return {
    success: result.success,
    dry_run: searchParams.dry_run,
    phases: result.phases,
    stats: {
      jobs_searched: state.jobsSearched,
      jobs_matched: state.jobsMatched,
      jobs_applied: state.jobsApplied,
      jobs_failed: state.jobsFailed,
      remaining_quota: preferences.daily_application_limit - state.jobsApplied,
    },
    timestamp: result.timestamp,
  };
}

async function executeApplyToJob(params, state) {
  const applyParams = validateApplyParams(params);

  if (state.jobsApplied >= state.preferences.dailyApplicationLimit && !applyParams.dry_run) {
    return {
      success: false,
      error: 'Daily application limit reached',
      limit: state.preferences.dailyApplicationLimit,
      applied_today: state.jobsApplied,
    };
  }

  const system = createApplySystem(state.preferences);
  await system.searchOnly?.([applyParams.job_id], { notify: false });

  const applyResult = await system.run({
    keywords: [String(applyParams.job_id)],
    dryRun: applyParams.dry_run,
    notify: false,
  });

  if (applyParams.dry_run || applyResult.phases.apply?.succeeded > 0) {
    state.jobsApplied += applyParams.dry_run ? 1 : applyResult.phases.apply.succeeded;
    state.applications.push({
      jobId: applyParams.job_id,
      success: applyParams.dry_run ? true : applyResult.phases.apply?.succeeded > 0,
      dryRun: applyParams.dry_run,
      appliedAt: new Date().toISOString(),
    });
  }

  if (applyResult.phases.apply?.failed > 0) {
    state.jobsFailed += applyResult.phases.apply.failed;
  }

  return {
    success: applyResult.success,
    job_id: applyParams.job_id,
    dry_run: applyParams.dry_run,
    applied: applyParams.dry_run || applyResult.phases.apply?.succeeded > 0,
    phase_results: applyResult.phases,
    stats: {
      total_applied: state.jobsApplied,
      remaining_quota: state.preferences.dailyApplicationLimit - state.jobsApplied,
    },
    timestamp: new Date().toISOString(),
  };
}

function executeGetStatus(state) {
  const recentApplications = state.applications.slice(-20);

  return {
    success: true,
    session: {
      jobs_searched: state.jobsSearched,
      jobs_matched: state.jobsMatched,
      jobs_applied: state.jobsApplied,
      jobs_failed: state.jobsFailed,
      last_run_at: state.lastRunAt,
    },
    preferences: state.preferences,
    quota: {
      daily_limit: state.preferences.dailyApplicationLimit,
      used_today: state.jobsApplied,
      remaining: Math.max(0, state.preferences.dailyApplicationLimit - state.jobsApplied),
    },
    recent_applications: recentApplications,
  };
}

function executeSetPreferences(params, state) {
  const preferences = validatePreferenceParams(params);

  state.preferences = {
    matchScoreThreshold: preferences.match_score_threshold,
    dailyApplicationLimit: preferences.daily_application_limit,
    preferredPlatforms: preferences.preferred_platforms,
    excludeCompanies: preferences.exclude_companies,
    preferredCompanies: preferences.preferred_companies,
    keywords: preferences.keywords,
  };

  if (params.reset_quota) {
    state.jobsApplied = 0;
  }

  return {
    success: true,
    preferences: state.preferences,
    message: 'Preferences updated successfully',
    note: 'Changes take effect on next search_and_apply or apply_to_job call',
  };
}

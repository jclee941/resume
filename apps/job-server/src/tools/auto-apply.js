/**
 * MCP Tool: Auto Apply (자동 지원)
 *
 * Automatically apply to jobs based on search criteria and match score.
 * Delegates to UnifiedApplySystem for core logic.
 *
 * @module tools/auto-apply
 */

import { SessionManager } from './auth.js';
import { UnifiedApplySystem } from '../shared/services/apply/unified-apply-system.js';

/**
 * Session state for auto-apply operations
 * @type {Object|null}
 */
let sessionState = null;

/**
 * Initialize or get current session state
 * @returns {Object} Session state object
 */
function getSessionState() {
  if (!sessionState) {
    sessionState = {
      jobsSearched: 0,
      jobsMatched: 0,
      jobsApplied: 0,
      jobsFailed: 0,
      applications: [],
      lastRunAt: null,
      preferences: {
        matchScoreThreshold: 75,
        dailyApplicationLimit: 20,
        preferredPlatforms: ['wanted'],
      },
    };
  }
  return sessionState;
}

/**
 * Validate search parameters
 * @param {Object} params - Search parameters
 * @returns {Object} Validated parameters with defaults
 */
function validateSearchParams(params) {
  return {
    keywords: Array.isArray(params.keywords)
      ? params.keywords
      : ['DevOps', 'SRE', '클우드 엔지니어'],
    tag_type_ids: params.tag_type_ids || [674, 672, 665], // DevOps, Security, System Admin
    locations: params.locations || 'all',
    years: params.years ?? -1,
    limit: Math.min(params.limit || 50, 100),
    matchScoreThreshold:
      params.match_score_threshold ?? sessionState?.preferences?.matchScoreThreshold ?? 75,
    dry_run: params.dry_run ?? true,
  };
}

/**
 * Validate apply parameters
 * @param {Object} params - Apply parameters
 * @returns {Object} Validated parameters
 * @throws {Error} If job_id is missing
 */
function validateApplyParams(params) {
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

/**
 * Validate preference parameters
 * @param {Object} params - Preference parameters
 * @returns {Object} Validated parameters
 */
function validatePreferenceParams(params) {
  return {
    match_score_threshold: params.match_score_threshold ?? 75,
    daily_application_limit: params.daily_application_limit ?? 20,
    preferred_platforms: params.preferred_platforms ?? ['wanted'],
    exclude_companies: params.exclude_companies ?? [],
    preferred_companies: params.preferred_companies ?? [],
    keywords: params.keywords ?? ['시니어 엔지니어', '클우드 엔지니어', 'SRE'],
  };
}

/**
 * Create UnifiedApplySystem instance with current preferences
 * @param {Object} preferences - User preferences
 * @returns {UnifiedApplySystem} Configured apply system
 */
function createApplySystem(preferences) {
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

/**
 * MCP Tool: wanted_auto_apply
 *
 * Automatically search and apply to jobs based on criteria and match scores.
 */
export const autoApplyTool = {
  name: 'wanted_auto_apply',
  description: `Automatically apply to jobs based on search criteria and match score.

**Actions:**
- search_and_apply: Search jobs with criteria, filter by match score, apply to matches
- apply_to_job: Apply to a specific job by ID
- get_status: Get current auto-apply session status
- set_preferences: Configure match threshold, daily limits, and platform preferences

**Match Score System:**
- < 60: Skip (poor match)
- 60-74: Review recommended (manual review)
- ≥ 75: Auto-apply eligible (default threshold)

**Daily Limits:**
- Default: 20 applications per day
- Configurable via set_preferences

**Example Usage:**
// Search and apply to DevOps jobs with 80+ match score
wanted_auto_apply({
  action: 'search_and_apply',
  keywords: ['DevOps', 'SRE'],
  match_score_threshold: 80,
  dry_run: true  // Set false for actual applications
});

// Apply to specific job
wanted_auto_apply({
  action: 'apply_to_job',
  job_id: 325174,
  dry_run: false
});

// Check session status
wanted_auto_apply({ action: 'get_status' });

// Update preferences
wanted_auto_apply({
  action: 'set_preferences',
  match_score_threshold: 70,
  daily_application_limit: 15
});`,

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['search_and_apply', 'apply_to_job', 'get_status', 'set_preferences'],
        description: 'Action to perform',
      },

      // search_and_apply parameters
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: 'Job search keywords (e.g., ["DevOps", "SRE", "클우드"])',
      },
      tag_type_ids: {
        type: 'array',
        items: { type: 'number' },
        description: 'Job category IDs (674=DevOps, 672=Security, 665=System Admin)',
      },
      locations: {
        type: 'string',
        description: 'Location filter (all, seoul, busan, etc.)',
        default: 'all',
      },
      years: {
        type: 'number',
        description: 'Experience years (-1 for all, 0 for entry level)',
        default: -1,
      },
      limit: {
        type: 'number',
        description: 'Maximum jobs to search (max 100)',
        default: 50,
      },
      match_score_threshold: {
        type: 'number',
        description: 'Minimum match score to apply (0-100, default: 75)',
        default: 75,
        minimum: 0,
        maximum: 100,
      },

      // apply_to_job parameters
      job_id: {
        type: 'number',
        description: 'Job ID to apply to (required for apply_to_job)',
      },
      resume_id: {
        type: 'string',
        description: 'Resume ID to use for application (optional)',
      },
      cover_letter: {
        type: 'string',
        description: 'Custom cover letter text (optional)',
      },

      // set_preferences parameters
      daily_application_limit: {
        type: 'number',
        description: 'Maximum daily applications (default: 20)',
        default: 20,
        minimum: 1,
        maximum: 100,
      },
      preferred_platforms: {
        type: 'array',
        items: { type: 'string' },
        description: 'Platforms to search (wanted, jobkorea, saramin)',
        default: ['wanted'],
      },
      exclude_companies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Company names to exclude from results',
        default: [],
      },
      preferred_companies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Company names to prioritize',
        default: [],
      },

      // Common parameters
      dry_run: {
        type: 'boolean',
        description: 'Preview mode - show what would be applied without actual submission',
        default: true,
      },
    },
    required: ['action'],
  },

  /**
   * Execute auto-apply tool action
   * @param {Object} params - Tool parameters
   * @returns {Promise<Object>} Execution result
   */
  async execute(params) {
    const { action } = params;

    // Verify authentication for actions that need it
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

    const state = getSessionState();

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
            available_actions: [
              'search_and_apply',
              'apply_to_job',
              'get_status',
              'set_preferences',
            ],
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
  },
};

/**
 * Execute search_and_apply action
 * @param {Object} params - Search parameters
 * @param {Object} state - Session state
 * @returns {Promise<Object>} Search and apply results
 */
async function executeSearchAndApply(params, state) {
  const searchParams = validateSearchParams(params);
  const preferences = {
    ...state.preferences,
    match_score_threshold: searchParams.matchScoreThreshold,
  };

  const system = createApplySystem(preferences);

  // Update session preferences if threshold was provided
  if (params.match_score_threshold !== undefined) {
    state.preferences.matchScoreThreshold = params.match_score_threshold;
  }

  const result = await system.run({
    keywords: searchParams.keywords,
    dryRun: searchParams.dry_run,
    notify: false,
  });

  // Update session state
  state.jobsSearched += result.phases.search.found || 0;
  state.jobsMatched += result.phases.filter?.matched || 0;
  state.jobsApplied += result.phases.apply?.succeeded || 0;
  state.jobsFailed += result.phases.apply?.failed || 0;
  state.lastRunAt = new Date().toISOString();

  if (result.phases.apply?.results) {
    state.applications.push(
      ...result.phases.apply.results.map((r) => ({
        jobId: r.job?.id,
        company: r.job?.company,
        title: r.job?.title,
        success: r.success,
        dryRun: r.dryRun,
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

/**
 * Execute apply_to_job action
 * @param {Object} params - Apply parameters
 * @param {Object} state - Session state
 * @returns {Promise<Object>} Apply result
 */
async function executeApplyToJob(params, state) {
  const applyParams = validateApplyParams(params);

  // Check daily limit
  if (state.jobsApplied >= state.preferences.dailyApplicationLimit && !applyParams.dry_run) {
    return {
      success: false,
      error: 'Daily application limit reached',
      limit: state.preferences.dailyApplicationLimit,
      applied_today: state.jobsApplied,
    };
  }

  const system = createApplySystem(state.preferences);

  // Create a minimal job object for single-job apply
  const job = {
    id: applyParams.job_id,
    source: 'wanted',
    sourceUrl: `https://www.wanted.co.kr/wd/${applyParams.job_id}`,
  };

  const result = await system.searchOnly?.([applyParams.job_id], { notify: false });

  // Try to get job details if searchOnly is not available
  let jobDetails = result?.jobs?.[0];

  if (!jobDetails) {
    // Fallback: create job object without details
    jobDetails = job;
  }

  // Apply to the single job
  const applyResult = await system.run({
    keywords: [String(applyParams.job_id)],
    dryRun: applyParams.dry_run,
    notify: false,
  });

  // Update session state
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

/**
 * Execute get_status action
 * @param {Object} state - Session state
 * @returns {Object} Current session status
 */
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

/**
 * Execute set_preferences action
 * @param {Object} params - Preference parameters
 * @param {Object} state - Session state
 * @returns {Object} Updated preferences
 */
function executeSetPreferences(params, state) {
  const preferences = validatePreferenceParams(params);

  // Update session preferences
  state.preferences = {
    matchScoreThreshold: preferences.match_score_threshold,
    dailyApplicationLimit: preferences.daily_application_limit,
    preferredPlatforms: preferences.preferred_platforms,
    excludeCompanies: preferences.exclude_companies,
    preferredCompanies: preferences.preferred_companies,
    keywords: preferences.keywords,
  };

  // Reset quota tracking if daily limit changed significantly
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

export default autoApplyTool;

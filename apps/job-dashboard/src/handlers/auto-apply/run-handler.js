import { normalizeError } from '@resume/shared/errors';
import {
  getConfig,
  getTodayApplicationCount,
  isAlreadyApplied,
  recordApplication,
} from './db-helpers.js';
import { getWantedSession } from './session-helpers.js';
import { SUPPORTED_PLATFORMS } from './constants.js';
import { jsonResponse } from './response.js';
import { applyMatchedJobs } from './application-actions.js';
import { createSearchResults, selectMatchedJobs } from './job-selection.js';
import { primeWantedSession, searchPlatformJobs } from './job-search.js';

export async function runAutoApply({ request, env, clients }) {
  const body = await request.json().catch(() => ({}));
  const {
    dryRun = true,
    maxApplications = null,
    keywords = null,
    platforms = ['wanted', 'linkedin', 'remember'],
  } = body;
  const config = await getConfig(env);

  if (!config.autoApplyEnabled && !dryRun) {
    return jsonResponse(
      {
        success: false,
        error: 'Auto-apply is disabled',
        hint: 'Enable via PUT /api/config with auto_apply_enabled=true',
      },
      400
    );
  }

  const activePlatforms = platforms.filter((platform) => SUPPORTED_PLATFORMS.includes(platform));
  if (activePlatforms.length === 0) {
    return jsonResponse(
      { success: false, error: `No valid platforms. Supported: ${SUPPORTED_PLATFORMS.join(', ')}` },
      400
    );
  }

  const searchKeywords = keywords || config.keywords;
  const maxApps = maxApplications || config.maxDailyApplications;
  const minScore = config.minMatchScore;
  const todayCount = await getTodayApplicationCount(env);
  const remaining = Math.max(0, maxApps - todayCount);

  if (remaining === 0 && !dryRun) {
    return jsonResponse({
      success: true,
      message: 'Daily limit reached',
      todayApplications: todayCount,
      maxDaily: maxApps,
    });
  }

  const searchResults = createSearchResults();
  try {
    if (activePlatforms.includes('wanted')) {
      await primeWantedSession({ env, clients, getWantedSession });
    }

    const allJobs = await searchPlatformJobs({
      clients,
      activePlatforms,
      searchKeywords,
      searchResults,
    });
    const matchedJobs = selectMatchedJobs({ allJobs, searchKeywords, minScore, searchResults });
    await applyMatchedJobs({
      env,
      clients,
      matchedJobs,
      dryRun,
      remaining,
      searchResults,
      isAlreadyApplied,
      recordApplication,
      getWantedSession,
    });

    return jsonResponse({
      success: true,
      dryRun,
      platforms: activePlatforms,
      config: { keywords: searchKeywords, minMatchScore: minScore, maxDailyApplications: maxApps },
      todayApplications: todayCount,
      remaining,
      results: searchResults,
    });
  } catch (error) {
    const normalized = normalizeError(error, { handler: 'AutoApply', action: 'executeAutoApply' });
    console.error('[AutoApply] Auto-apply error:', normalized.message, normalized.context);
    return jsonResponse(
      {
        success: false,
        error: normalized.message,
        errorCode: normalized.errorCode,
        results: searchResults,
      },
      500
    );
  }
}

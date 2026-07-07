import { normalizeError } from '@resume/shared/errors';
import {
  isAtsDryRunPlatform,
  normalizeApplicationPlatforms,
  supportedApplicationPlatforms,
} from '../../workflows/application/platforms.js';
import {
  getConfig,
  getTodayApplicationCount,
  isAlreadyApplied,
  recordApplication,
} from './db-helpers.js';
import { isCompanyAlreadyApplied } from './duplicate-company.js';
import { getWantedSession } from './session-helpers.js';
import { jsonResponse } from '../../middleware/cors.js';
import { applyMatchedJobs } from './application-actions.js';
import {
  dispatchCloudflareNativeAutoApply,
  shouldDispatchCloudflareNative,
} from './native-dispatch.js';
import { readExplicitCandidates } from './explicit-candidates.js';
import { createSearchResults, selectMatchedJobs } from './job-selection.js';
import { primeWantedSession, searchPlatformJobs } from './job-search.js';
import { rejectInvalidRealSubmit } from './real-submit-gate.js';
import { isFailedDiscoveryRun } from './discovery-failure.js';
import { getAutoApplyRunId } from './run-id.js';

export async function runAutoApply({ request, env, clients }) {
  const body = await request.json().catch(() => ({}));
  if (hasMalformedPlatforms(body)) {
    return jsonResponse(
      {
        success: false,
        error: 'platforms must be an array when provided',
        errorCode: 'INVALID_AUTO_APPLY_REQUEST',
      },
      400
    );
  }

  const {
    dryRun = true,
    maxApplications = null,
    keywords = null,
    platforms = ['wanted', 'linkedin', 'remember'],
    atsStub = false,
  } = body;
  const runId = getAutoApplyRunId(body);
  const explicitCandidates = readExplicitCandidates(body);
  if (explicitCandidates.error) {
    return jsonResponse(
      {
        success: false,
        error: explicitCandidates.error,
        errorCode: 'INVALID_AUTO_APPLY_REQUEST',
      },
      explicitCandidates.status
    );
  }
  const realSubmitRejection = rejectInvalidRealSubmit(body, dryRun, explicitCandidates);
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

  if (shouldDispatchCloudflareNative({ body, env, explicitCandidates, dryRun })) {
    if (realSubmitRejection) return realSubmitRejection;
    return dispatchCloudflareNativeAutoApply({ body, env, explicitCandidates });
  }
  if (realSubmitRejection) return realSubmitRejection;

  const activePlatforms = normalizeApplicationPlatforms(platforms, { atsStub, dryRun });
  if (activePlatforms.length === 0) {
    const supported = supportedApplicationPlatforms({ atsStub, dryRun }).join(', ');
    return jsonResponse(
      { success: false, error: `No valid platforms. Supported: ${supported}` },
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
    const searchablePlatforms = activePlatforms.filter((platform) =>
      canSearchPlatform(clients, platform)
    );

    if (!explicitCandidates.hasExplicitCandidates && searchablePlatforms.includes('wanted')) {
      await primeWantedSession({ env, clients, getWantedSession });
    }

    const allJobs = explicitCandidates.hasExplicitCandidates
      ? explicitCandidates.jobs
      : await collectPlatformJobs({
          clients,
          activePlatforms: searchablePlatforms,
          searchKeywords,
          searchResults,
        });
    if (isFailedDiscoveryRun(explicitCandidates, allJobs, searchResults)) {
      return jsonResponse(
        {
          success: false,
          error: 'Auto-apply discovery failed before any candidate was found',
          errorCode: 'AUTO_APPLY_DISCOVERY_FAILED',
          runId,
          dryRun,
          platforms: activePlatforms,
          results: searchResults,
        },
        500
      );
    }
    const matchedJobs = selectMatchedJobs({ allJobs, searchKeywords, minScore, searchResults });
    await applyMatchedJobs({
      env,
      clients,
      matchedJobs,
      dryRun,
      remaining,
      searchResults,
      isAlreadyApplied,
      isCompanyAlreadyApplied,
      recordApplication,
      getWantedSession,
      runId,
    });

    return jsonResponse({
      success: true,
      runId,
      dryRun,
      submitted: countSubmittedApplications(searchResults, dryRun),
      platforms: activePlatforms,
      config: { keywords: searchKeywords, minMatchScore: minScore, maxDailyApplications: maxApps },
      todayApplications: todayCount,
      remaining,
      results: searchResults,
      recursion: explicitCandidates.recursion,
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

async function collectPlatformJobs({ clients, activePlatforms, searchKeywords, searchResults }) {
  return searchPlatformJobs({
    clients,
    activePlatforms,
    searchKeywords,
    searchResults,
  });
}

function canSearchPlatform(clients, platform) {
  if (!isAtsDryRunPlatform(platform)) return true;
  return typeof clients?.[platform]?.searchJobs === 'function';
}

function countSubmittedApplications(searchResults, dryRun) {
  if (dryRun) return 0;
  return searchResults.jobs.filter((job) => job.action === 'applied').length;
}

function hasMalformedPlatforms(body) {
  return Object.prototype.hasOwnProperty.call(body, 'platforms') && !Array.isArray(body.platforms);
}

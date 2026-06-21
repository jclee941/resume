import { getConfig, getTodayApplicationCount } from './db-helpers.js';
import { getWantedSession } from './session-helpers.js';
import { SUPPORTED_PLATFORMS } from './constants.js';
import { jsonResponse } from './response.js';
import { ATS_DRY_RUN_PLATFORMS } from '../../workflows/application/platforms.js';

const SAFE_CONFIG = {
  autoApplyEnabled: false,
  maxDailyApplications: 0,
  minMatchScore: 100,
  keywords: [],
};

export async function getAutoApplyStatus(env) {
  const config = await getSafeConfig(env);
  const todayCount = await getSafeTodayCount(env);
  const cookies = await getSafeWantedSession(env);
  const platformStatus = {};
  const pendingApprovals = await getPendingApprovalCount(env);

  for (const platform of SUPPORTED_PLATFORMS) {
    const count = await getSafeTodayCount(env, platform);
    platformStatus[platform] = {
      todayApplications: count,
      authenticated: platform === 'wanted' ? !!cookies : true,
      mode: 'direct',
    };
  }

  for (const platform of ATS_DRY_RUN_PLATFORMS) {
    platformStatus[platform] = {
      todayApplications: 0,
      mode: 'dry-run',
      redacted: true,
      submissions: 'disabled',
      pendingApprovals,
    };
  }

  return jsonResponse({
    enabled: config.autoApplyEnabled,
    supportedPlatforms: [...SUPPORTED_PLATFORMS, ...ATS_DRY_RUN_PLATFORMS],
    todayApplications: todayCount,
    maxDaily: config.maxDailyApplications,
    remaining: Math.max(0, config.maxDailyApplications - todayCount),
    minMatchScore: config.minMatchScore,
    keywords: config.keywords,
    dryRun: {
      enabledByDefault: true,
      atsAdapters: ATS_DRY_RUN_PLATFORMS,
    },
    pendingApprovals,
    platforms: platformStatus,
  });
}

async function getSafeConfig(env) {
  try {
    return { ...SAFE_CONFIG, ...(await getConfig(env)) };
  } catch {
    return SAFE_CONFIG;
  }
}

async function getSafeTodayCount(env, platform = null) {
  try {
    return await getTodayApplicationCount(env, platform);
  } catch {
    return 0;
  }
}

async function getSafeWantedSession(env) {
  try {
    return await getWantedSession(env);
  } catch {
    return null;
  }
}

async function getPendingApprovalCount(env) {
  const db = env?.DB || env?.JOB_DB;
  if (!db) return 0;

  try {
    return await countPendingApprovalRequests(db);
  } catch {
    return countPendingApplicationApprovals(db);
  }
}

async function countPendingApprovalRequests(db) {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM approval_requests WHERE status IN (?, ?, ?)')
    .bind('pending', 'review', 'manual_review')
    .first();
  return result?.count || 0;
}

async function countPendingApplicationApprovals(db) {
  try {
    const result = await db
      .prepare('SELECT COUNT(*) as count FROM applications WHERE status IN (?, ?, ?)')
      .bind('pending_approval', 'review', 'manual_review')
      .first();
    return result?.count || 0;
  } catch {
    return 0;
  }
}

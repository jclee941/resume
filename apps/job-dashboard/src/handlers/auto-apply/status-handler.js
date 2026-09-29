import { getConfig, getTodayApplicationCount } from './db-helpers.js';
import { getWantedSession } from './session-helpers.js';
import { SUPPORTED_PLATFORMS } from './constants.js';
import { jsonResponse } from '../../middleware/cors.js';
import { ATS_DRY_RUN_PLATFORMS } from '../../workflows/application/platforms.js';

/**
 * @typedef {import('./db-helpers.js').DbEnv} StatusEnv
 * @typedef {import('./db-helpers.js').D1DatabaseLike} StatusDb
 */

const SAFE_CONFIG = {
  autoApplyEnabled: false,
  maxDailyApplications: 0,
  minMatchScore: 100,
  keywords: [],
};

/**
 * @param {StatusEnv} env
 * @returns {Promise<Response>}
 */
export async function getAutoApplyStatus(env) {
  const config = await getSafeConfig(env);
  const todayCount = await getSafeTodayCount(env);
  const cookies = await getSafeWantedSession(env);
  /** @type {Record<string, Record<string, unknown>>} */
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

/**
 * @param {StatusEnv} env
 */
async function getSafeConfig(env) {
  try {
    return { ...SAFE_CONFIG, ...(await getConfig(env)) };
  } catch {
    return SAFE_CONFIG;
  }
}

/**
 * @param {StatusEnv} env
 * @param {string | null} [platform]
 * @returns {Promise<number>}
 */
async function getSafeTodayCount(env, platform = null) {
  try {
    return await getTodayApplicationCount(env, platform);
  } catch {
    return 0;
  }
}

/**
 * @param {StatusEnv} env
 * @returns {Promise<string | null>}
 */
async function getSafeWantedSession(env) {
  try {
    return await getWantedSession(env);
  } catch {
    return null;
  }
}

/**
 * @param {StatusEnv} env
 * @returns {Promise<number>}
 */
async function getPendingApprovalCount(env) {
  const db = env?.JOB_DB;
  if (!db) return 0;

  try {
    return await countPendingApprovalRequests(db);
  } catch {
    return countPendingApplicationApprovals(db);
  }
}

/**
 * @param {StatusDb} db
 * @returns {Promise<number>}
 */
async function countPendingApprovalRequests(db) {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM approval_requests WHERE status IN (?, ?, ?)')
    .bind('pending', 'review', 'manual_review')
    .first();
  return result?.count || 0;
}

/**
 * @param {StatusDb} db
 * @returns {Promise<number>}
 */
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

import { getConfig, getTodayApplicationCount } from './db-helpers.js';
import { readPlatformSession } from '../../services/platform-session.js';
import { DISABLED_PLATFORMS, SUPPORTED_PLATFORMS } from './constants.js';
import { jsonResponse } from '../../middleware/cors.js';
import { ATS_DRY_RUN_PLATFORMS } from '../../workflows/application/platforms.js';

/**
 * @typedef {import('./db-helpers.js').DbEnv & Parameters<typeof readPlatformSession>[0]} StatusEnv
 * @typedef {import('./db-helpers.js').D1DatabaseLike} StatusDb
 */

/**
 * @param {StatusEnv} env
 * @returns {Promise<Response>}
 */
export async function getAutoApplyStatus(env) {
  try {
    const config = await getConfig(env);
    const todayCount = await getTodayApplicationCount(env);
    /** @type {Record<string, Record<string, unknown>>} */
    const platformStatus = {};
    const pendingApprovals = await getPendingApprovalCount(env);

    for (const platform of SUPPORTED_PLATFORMS) {
      const count = await getTodayApplicationCount(env, platform);
      const disabled = DISABLED_PLATFORMS.includes(platform);
      platformStatus[platform] = {
        todayApplications: count,
        authenticated: disabled ? false : await hasPlatformSession(env, platform),
        mode: 'direct',
        ...(disabled && { disabled: true }),
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
      disabledPlatforms: DISABLED_PLATFORMS,
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
  } catch (error) {
    console.error(
      '[auto-apply] status read failed:',
      error instanceof Error ? error.name : 'UnknownError'
    );
    return jsonResponse(
      { error: 'Automation status unavailable', code: 'AUTOMATION_STATUS_UNAVAILABLE' },
      503
    );
  }
}

/**
 * @param {StatusEnv} env
 * @param {string} platform
 * @returns {Promise<boolean>}
 */
async function hasPlatformSession(env, platform) {
  try {
    return Boolean(await readPlatformSession(env, platform));
  } catch {
    return false;
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
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM applications WHERE status IN (?, ?, ?)')
    .bind('pending_approval', 'review', 'manual_review')
    .first();
  return result?.count || 0;
}

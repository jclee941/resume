import { syncJobKoreaFromSsot } from './jobkorea.js';
export { JOBKOREA_SESSION_EXPIRED } from './jobkorea-editor.js';
import { syncWantedFromSsot } from './wanted.js';

/** Platforms whose resume sync runs inside the Worker. */
export const RESUME_SYNC_PLATFORMS = Object.freeze(['wanted', 'jobkorea']);

/** @type {Record<string, string>} */
const UNSUPPORTED_REASONS = {
  saramin:
    'Saramin has no Cloudflare-native resume sync: no Saramin login is configured (no SARAMIN_* secret and no auth:saramin session)',
};

/**
 * @typedef {Parameters<typeof syncWantedFromSsot>[0] & Parameters<typeof syncJobKoreaFromSsot>[0]} ResumePlatformSyncEnv
 * @typedef {Parameters<typeof syncWantedFromSsot>[1] & Parameters<typeof syncJobKoreaFromSsot>[1]} ResumePlatformSsot
 * @typedef {{ platform: string; success: boolean; dryRun?: boolean; error?: string; code?: string; [key: string]: unknown }} PlatformSyncOutcome
 */

/**
 * @param {unknown} error
 * @returns {string | undefined}
 */
function errorCode(error) {
  const code = /** @type {{ code?: unknown } | null | undefined} */ (error)?.code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * Run one platform's resume sync. Never throws: failures come back as
 * `{ success: false, error }` so a caller can report every platform.
 * @param {ResumePlatformSyncEnv} env
 * @param {string} platform
 * @param {ResumePlatformSsot} ssot
 * @param {{ dryRun: boolean; targetResumeId?: string | null }} options
 * @returns {Promise<PlatformSyncOutcome>}
 */
export async function syncResumePlatform(env, platform, ssot, options) {
  try {
    if (platform === 'wanted') return await syncWantedFromSsot(env, ssot, options);
    if (platform === 'jobkorea') return await syncJobKoreaFromSsot(env, ssot, options);
  } catch (error) {
    return {
      platform,
      success: false,
      dryRun: options.dryRun,
      error: error instanceof Error ? error.message : String(error),
      ...(errorCode(error) ? { code: errorCode(error) } : {}),
    };
  }
  return {
    platform,
    success: false,
    dryRun: options.dryRun,
    error: UNSUPPORTED_REASONS[platform] || `${platform} has no Cloudflare-native resume sync`,
  };
}

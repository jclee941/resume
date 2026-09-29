import { WantedAPI } from '@resume/shared/clients/wanted';
import { mapToWantedFormat, syncWantedResume } from '@resume/shared/platform-sync/wanted';
import { readPlatformSession } from '../platform-session.js';

/**
 * @typedef {Parameters<typeof readPlatformSession>[0]} WantedSyncEnv
 * @typedef {Parameters<typeof mapToWantedFormat>[0] & Parameters<typeof syncWantedResume>[3]} WantedSsot
 * @typedef {Parameters<typeof syncWantedResume>[0]} WantedResumeApi
 * @typedef {{
 *   dryRun: boolean;
 *   targetResumeId?: string | null;
 *   createApi?: (cookies: string) => WantedResumeApi;
 * }} WantedSyncOptions
 */

/**
 * @param {string} cookies
 * @returns {WantedResumeApi}
 */
function createWantedApi(cookies) {
  return new WantedAPI(cookies);
}

/**
 * Sync the SSoT resume to the stored Wanted resume with the KV `auth:wanted`
 * session. Dry runs read the live resume and report what would be written.
 * @param {WantedSyncEnv} env
 * @param {WantedSsot} ssot
 * @param {WantedSyncOptions} options
 * @returns {Promise<{ platform: 'wanted'; success: boolean; dryRun: boolean; error?: string; [key: string]: unknown }>}
 */
export async function syncWantedFromSsot(env, ssot, options) {
  const { dryRun, targetResumeId, createApi = createWantedApi } = options;
  if (!targetResumeId) {
    return {
      platform: 'wanted',
      success: false,
      dryRun,
      error: 'No Wanted target resume ID (resumes.target_resume_id or targetResumeId)',
    };
  }
  const cookies = await readPlatformSession(env, 'wanted');
  if (!cookies) {
    return {
      platform: 'wanted',
      success: false,
      dryRun,
      error:
        'No Wanted session in KV (auth:wanted); mint one with POST /job/api/wanted/refresh-session',
    };
  }

  const api = createApi(cookies);
  const data = mapToWantedFormat(ssot);
  if (dryRun) {
    const current = await api.getResumeDetail(targetResumeId);
    return {
      platform: 'wanted',
      success: true,
      dryRun: true,
      wouldSync: {
        educations: data.educations,
        awards: (ssot.awards || []).map((award) => award.name),
        careers: data.careers.length,
        skills: data.skills.length,
      },
      current: {
        educations: current.educations || [],
        activities: (current.activities || []).map((activity) => activity.title),
      },
    };
  }

  const result = await syncWantedResume(api, data, targetResumeId, ssot);
  return {
    platform: 'wanted',
    success: result.errors.length === 0,
    dryRun: false,
    updated: result.updated,
    errors: result.errors,
    ...(result.errors.length > 0
      ? { error: result.errors.map((entry) => `${entry.section}: ${entry.error}`).join('; ') }
      : {}),
  };
}

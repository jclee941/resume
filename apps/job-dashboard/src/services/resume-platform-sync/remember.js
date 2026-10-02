import { mapToRememberProfile } from '@resume/shared/platform-sync/remember';
import { REMEMBER_PROFILE_API_URL, rememberRequest } from '../remember/remember-api.js';
import { withRememberToken } from '../remember/remember-session.js';

/**
 * @typedef {import('../remember/remember-session.js').RememberEnv} RememberSyncEnv
 * @typedef {Parameters<typeof mapToRememberProfile>[0]} RememberSsot
 * @typedef {{ dryRun: boolean; targetResumeId?: string | null; fetchImpl?: typeof fetch }} RememberSyncOptions
 */

/**
 * Sync the SSoT resume to the Remember open profile with the KV `auth:remember` session (logged
 * in again when missing or rejected). Dry runs report the sections that would change.
 * @param {RememberSyncEnv} env
 * @param {RememberSsot} ssot
 * @param {RememberSyncOptions} options
 * @returns {Promise<{ platform: 'remember'; success: boolean; dryRun: boolean; error?: string; [key: string]: unknown }>}
 */
export async function syncRememberFromSsot(env, ssot, { dryRun, fetchImpl }) {
  return withRememberToken(
    env,
    async (token) => {
      const me = await rememberRequest(token, `${REMEMBER_PROFILE_API_URL}/v2/open_profiles/me`, {
        fetchImpl,
      });
      const current = me?.data?.open_profile;
      if (!current?.id) {
        return {
          platform: 'remember',
          success: false,
          dryRun,
          error: 'Remember account has no open profile',
        };
      }
      const openProfile = mapToRememberProfile(ssot, current);
      const changes = summarize(openProfile);
      if (dryRun || Object.keys(openProfile).length === 0) {
        return { platform: 'remember', success: true, dryRun, changes };
      }
      await rememberRequest(
        token,
        `${REMEMBER_PROFILE_API_URL}/v2/open_profiles/${current.id}?version=2`,
        {
          method: 'PUT',
          body: { open_profile: openProfile },
          fetchImpl,
        }
      );
      return { platform: 'remember', success: true, dryRun: false, changes };
    },
    { fetchImpl }
  );
}

/**
 * Section names with how many entries change, never the values.
 * @param {Record<string, unknown>} openProfile
 * @returns {Record<string, number>}
 */
function summarize(openProfile) {
  return Object.fromEntries(
    Object.entries(openProfile).map(([section, value]) => [
      section,
      Array.isArray(value) ? value.length : 1,
    ])
  );
}

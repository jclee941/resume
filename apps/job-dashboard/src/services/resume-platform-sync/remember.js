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
    async (token, relayFetch) => {
      const me = await rememberRequest(token, `${REMEMBER_PROFILE_API_URL}/v2/open_profiles/me`, {
        fetchImpl: relayFetch,
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
      const url = `${REMEMBER_PROFILE_API_URL}/v2/open_profiles/${current.id}?version=2`;
      for (const body of updateRequests(openProfile)) {
        await rememberRequest(token, url, {
          method: 'PUT',
          body: { open_profile: body },
          fetchImpl: relayFetch,
        });
      }
      return { platform: 'remember', success: true, dryRun: false, changes };
    },
    { fetchImpl }
  );
}

/**
 * Remember refuses to delete the main career ("해당 정보를 삭제할 수 없습니다"), so career removals
 * go in a second request, after the first one has moved the main flag.
 * @param {ReturnType<typeof mapToRememberProfile>} openProfile
 * @returns {Array<ReturnType<typeof mapToRememberProfile>>}
 */
function updateRequests(openProfile) {
  const careers = openProfile.careers_attributes ?? [];
  const removals = careers.filter((career) => career._destroy);
  if (removals.length === 0) return [openProfile];
  /** @type {ReturnType<typeof mapToRememberProfile>} */
  const first = {
    ...openProfile,
    careers_attributes: careers.filter((career) => !career._destroy),
  };
  if (first.careers_attributes?.length === 0) delete first.careers_attributes;
  return [...(Object.keys(first).length > 0 ? [first] : []), { careers_attributes: removals }];
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

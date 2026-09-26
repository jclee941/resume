import { WantedAPI } from '@resume/shared/clients/wanted';
import { buildWantedChanges } from './wanted-profile-changes.js';
import { applyWantedChanges } from './wanted-profile-apply.js';

/**
 * @typedef {{
 *   id: string;
 *   key: string;
 *   is_default?: boolean;
 * }} WantedResumeItem
 *
 * @typedef {{
 *   auth: { getCookies(platform: string): Promise<string | null> };
 *   [key: string]: unknown;
 * }} WantedSyncContext
 *
 * @typedef {ReturnType<typeof buildWantedChanges> & {
 *   resumeFields: ReturnType<typeof buildWantedChanges>['resumeFields'] & {
 *     updates: Record<string, unknown>;
 *   };
 * }} PatchedChanges
 */

/**
 * @param {WantedSyncContext} context
 * @param {import('./wanted-profile-changes.js').SsotData} ssotData
 * @param {{ headline: string; [key: string]: unknown }} profileData
 * @param {boolean} dryRun
 * @param {string | number | null | undefined} targetResumeId
 * @returns {Promise<Record<string, unknown>>}
 */
export async function syncWantedProfile(context, ssotData, profileData, dryRun, targetResumeId) {
  const { auth } = context;
  const cookies = await auth.getCookies('wanted');
  if (!cookies) {
    return {
      method: 'chaos_api',
      error: 'Wanted authentication required. Please login first.',
      authenticated: false,
    };
  }

  const client = new /** @type {new (cookies?: string | null) => WantedAPI} */ (WantedAPI)(cookies);

  try {
    /** @type {WantedResumeItem[]} */
    const resumes = await client.getResumeList();
    const selectedResume =
      resumes.find((resume) => String(resume.id || resume.key) === String(targetResumeId)) ||
      resumes.find((resume) => resume.is_default) ||
      resumes[0];

    if (!selectedResume) {
      return {
        method: 'chaos_api',
        error: 'No resumes found in Wanted account',
        authenticated: true,
      };
    }

    const resumeId = selectedResume.id || selectedResume.key;
    const currentResume = await client.getResumeDetail(resumeId);
    const changes = buildWantedChanges(ssotData, profileData, currentResume);

    if (dryRun) {
      return {
        method: 'chaos_api',
        authenticated: true,
        dryRun: true,
        resumeId,
        currentResume: {
          id: currentResume?.id,
          title: currentResume?.title,
          careersCount: currentResume?.careers?.length || 0,
          skillsCount: currentResume?.skills?.length || 0,
        },
        proposedChanges: changes,
        wouldUpdate: profileData,
      };
    }

    const syncResults = await applyWantedChanges(
      client,
      resumeId,
      /** @type {PatchedChanges} */ (changes),
      profileData
    );
    return {
      method: 'chaos_api',
      authenticated: true,
      dryRun: false,
      resumeId,
      syncResults,
      message: `Synced ${syncResults.updated.length} sections, ${syncResults.failed.length} failed`,
    };
  } catch (error) {
    return {
      method: 'chaos_api',
      authenticated: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

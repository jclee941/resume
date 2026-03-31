import { WantedClient } from '@resume/shared/wanted-client';
import { buildWantedChanges } from './wanted-profile-changes.js';
import { applyWantedChanges } from './wanted-profile-apply.js';

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

  const client = new WantedClient(cookies);

  try {
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

    const syncResults = await applyWantedChanges(client, resumeId, changes, profileData);
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
      error: error.message,
    };
  }
}

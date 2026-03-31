import { SessionManager } from '../auth.js';
import {
  mapToWantedFormat,
  syncAbout,
  syncActivities,
  syncCareers,
  syncContact,
  syncEducations,
  syncLanguageCerts,
  syncSkills,
} from './wanted-sync-operations.js';

export async function diffPlatform(sourceData, params) {
  const api = await SessionManager.getAPI();
  if (!api) return { error: 'Not authenticated' };
  if (!params.resume_id) return { error: 'resume_id required' };

  try {
    const remote = await api.getResumeDetail(params.resume_id);
    return compareWantedData(sourceData, remote);
  } catch (e) {
    return { error: e.message };
  }
}

export function compareWantedData(source, remote) {
  const diff = { careers: [], educations: [], skills: [] };
  const localCareers = source.careers || [];
  const remoteCareers = remote.careers || [];

  if (localCareers.length !== remoteCareers.length) {
    diff.careers.push({
      type: 'count_mismatch',
      local: localCareers.length,
      remote: remoteCareers.length,
    });
  }

  for (const local of localCareers) {
    const remoteMatch = remoteCareers.find((r) =>
      r.company?.name?.includes(local.company?.replace(/[()주]/g, ''))
    );
    if (!remoteMatch) diff.careers.push({ type: 'missing_remote', local });
  }

  return diff;
}

export { mapToWantedFormat };

export async function syncToWanted(data, params, sourceData = {}, injectedLogger = console) {
  if (!params.resume_id) return { error: 'resume_id required for Wanted sync' };

  const api = await SessionManager.getAPI();
  if (!api) return { error: 'Not authenticated. Use wanted_auth first.' };
  if (params.dry_run) return { dry_run: true, would_sync: data };

  const results = { updated: [], errors: [] };

  await runStep(results, 'profile', async () => {
    await api.updateProfile({
      headline: data.profile.headline,
      description: data.profile.description,
    });
  });

  let resumeDetail;
  try {
    resumeDetail = await api.getResumeDetail(params.resume_id);
  } catch (e) {
    results.errors.push({ section: 'resume_detail', error: e.message });
    return results;
  }

  await runStep(results, 'careers', async () => {
    await syncCareers(
      api,
      params.resume_id,
      data.careers || [],
      resumeDetail.careers || [],
      sourceData.careers || []
    );
  });

  await runStep(results, 'educations', async () => {
    await syncEducations(
      api,
      params.resume_id,
      data.educations || [],
      resumeDetail.educations || []
    );
  });

  await runStep(results, 'skills', async () => {
    await syncSkills(
      api,
      params.resume_id,
      data.skills || [],
      resumeDetail.skills || [],
      injectedLogger
    );
  });

  await runStep(results, 'activities', async () => {
    await syncActivities(
      api,
      params.resume_id,
      sourceData,
      (resumeDetail.activities || []).filter((activity) => activity.activity_type === 'CERTIFICATE')
    );
  });

  await runStep(results, 'language_certs', async () => {
    await syncLanguageCerts(api, params.resume_id, sourceData, resumeDetail.language_certs || []);
  });

  await runStep(results, 'about', async () => {
    await syncAbout(api, params.resume_id, sourceData, resumeDetail.about || '');
  });

  await runStep(results, 'contact', async () => {
    await syncContact(api, params.resume_id, sourceData, resumeDetail);
  });

  return results;
}

async function runStep(results, section, fn) {
  try {
    await fn();
    results.updated.push(section);
  } catch (e) {
    results.errors.push({ section, error: e.message });
  }
}

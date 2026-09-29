import { SessionManager } from '../../shared/services/session/index.js';
import { mapToWantedFormat, syncWantedResume } from '@resume/shared/platform-sync/wanted';

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

  return syncWantedResume(api, data, params.resume_id, sourceData, injectedLogger);
}

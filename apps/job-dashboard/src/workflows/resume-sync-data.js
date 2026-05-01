import { DEFAULT_USER_AGENT } from '@resume/shared/ua';

export async function getMasterResumeData(env, resumeId) {
  const data = await env.JOB_DB.prepare('SELECT data FROM resumes WHERE id = ?')
    .bind(resumeId)
    .first();

  return data?.data ? JSON.parse(data.data) : null;
}

export async function exportFromPlatform(env, platform, resumeId) {
  const exporters = {
    wanted: () => exportFromWanted(env, resumeId),
    linkedin: () => exportFromLinkedIn(resumeId),
    remember: () => exportFromRemember(resumeId),
  };

  const exporter = exporters[platform];
  if (!exporter) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  return await exporter();
}

export async function exportFromWanted(env, resumeId) {
  const session = await env.SESSIONS.get('auth:wanted');
  if (!session) {
    throw new Error('No Wanted session');
  }

  try {
    const response = await fetch(`https://www.wanted.co.kr/api/chaos/resumes/v1/${resumeId}`, {
      headers: {
        Cookie: session,
        'User-Agent': DEFAULT_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Wanted API error: ${response.status}`);
    }

    const data = await response.json();
    return normalizeWantedResume(data);
  } catch (error) {
    throw new Error(`Wanted export failed: ${error.message}`);
  }
}

export async function exportFromLinkedIn(_resumeId) {
  return { careers: [], educations: [], skills: [] };
}

export async function exportFromRemember(_resumeId) {
  return { careers: [], educations: [], skills: [] };
}

export function normalizeWantedResume(data) {
  return {
    careers: data.careers || [],
    educations: data.educations || [],
    skills: data.skills || [],
    activities: data.activities || [],
    language_certs: data.language_certs || [],
    links: data.links || [],
  };
}

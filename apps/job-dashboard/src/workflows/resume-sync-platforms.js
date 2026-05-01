import { DEFAULT_USER_AGENT } from '@resume/shared/ua';

export async function syncToPlatform(env, platform, resumeId, diff) {
  const syncers = {
    wanted: () => syncToWanted(env, resumeId, diff),
    linkedin: () => syncToLinkedIn(resumeId, diff),
    remember: () => syncToRemember(resumeId, diff),
  };

  const syncer = syncers[platform];
  if (!syncer) {
    return { success: false, error: `Unknown platform: ${platform}` };
  }

  try {
    return await syncer();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function syncToWanted(env, resumeId, diff) {
  const session = await env.SESSIONS.get('auth:wanted');
  if (!session) {
    return { success: false, error: 'No Wanted session' };
  }

  const results = { additions: 0, updates: 0, deletions: 0, errors: [] };

  for (const add of diff.additions) {
    try {
      await wantedApiRequest('POST', `resumes/v2/${resumeId}/${add.section}`, add.item, session);
      results.additions++;
    } catch (error) {
      results.errors.push({ action: 'add', section: add.section, error: error.message });
    }
  }

  for (const update of diff.updates) {
    try {
      const id = update.existing.id;
      await wantedApiRequest(
        'PATCH',
        `resumes/v2/${resumeId}/${update.section}/${id}`,
        update.item,
        session
      );
      results.updates++;
    } catch (error) {
      results.errors.push({ action: 'update', section: update.section, error: error.message });
    }
  }

  return {
    success: results.errors.length === 0,
    ...results,
  };
}

export async function wantedApiRequest(method, path, body, session) {
  const response = await fetch(`https://www.wanted.co.kr/api/chaos/${path}`, {
    method,
    headers: {
      Cookie: session,
      'Content-Type': 'application/json',
      'User-Agent': DEFAULT_USER_AGENT,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function syncToLinkedIn(_resumeId, _diff) {
  return {
    success: false,
    error: 'LinkedIn profile sync requires browser automation — delegate to job-server',
  };
}

export async function syncToRemember(_resumeId, _diff) {
  return {
    success: false,
    error: 'Remember profile sync requires browser automation — delegate to job-server',
  };
}

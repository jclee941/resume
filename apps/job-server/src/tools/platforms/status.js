import { SessionManager } from '../auth.js';

export async function checkAllPlatformStatus(platforms) {
  const results = {};
  for (const platform of platforms) {
    results[platform] = await checkPlatformStatus(platform);
  }

  return { success: true, platforms: results };
}

export async function checkPlatformStatus(platform) {
  switch (platform) {
    case 'wanted': {
      const api = await SessionManager.getAPI();
      if (!api) return { authenticated: false, error: 'Not logged in' };
      try {
        const resumes = await api.getResumes();
        return {
          authenticated: true,
          resumes: resumes.map((r) => ({ id: r.id, title: r.title })),
        };
      } catch (e) {
        return { authenticated: false, error: e.message };
      }
    }

    case 'jobkorea':
    case 'remember':
      return {
        authenticated: false,
        method: 'browser_automation',
        note: 'Requires manual login via browser',
      };

    default:
      return { error: `Unknown platform: ${platform}` };
  }
}

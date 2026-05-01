import { getConfig, getTodayApplicationCount } from './db-helpers.js';
import { getWantedSession } from './session-helpers.js';
import { SUPPORTED_PLATFORMS } from './constants.js';
import { jsonResponse } from './response.js';

export async function getAutoApplyStatus(env) {
  const config = await getConfig(env);
  const todayCount = await getTodayApplicationCount(env);
  const cookies = await getWantedSession(env);
  const platformStatus = {};

  for (const platform of SUPPORTED_PLATFORMS) {
    const count = await getTodayApplicationCount(env, platform);
    platformStatus[platform] = {
      todayApplications: count,
      authenticated: platform === 'wanted' ? !!cookies : true,
    };
  }

  return jsonResponse({
    enabled: config.autoApplyEnabled,
    supportedPlatforms: SUPPORTED_PLATFORMS,
    todayApplications: todayCount,
    maxDaily: config.maxDailyApplications,
    remaining: Math.max(0, config.maxDailyApplications - todayCount),
    minMatchScore: config.minMatchScore,
    keywords: config.keywords,
    platforms: platformStatus,
  });
}

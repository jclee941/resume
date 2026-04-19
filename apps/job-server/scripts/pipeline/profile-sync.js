import { shipToElk } from './logging.js';

export async function runProfileSync(result, log, summarizeError) {
  try {
    const { CONFIG: syncConfig } = await import('../profile-sync/constants.js');
    const { loadSSOT: loadProfileSSOT } = await import('../profile-sync/utils.js');
    const { default: JKHandler } = await import('../profile-sync/jobkorea-handler.js');
    syncConfig.APPLY = true;
    syncConfig.DIFF_ONLY = false;
    syncConfig.HEADLESS = true;
    const ssot = loadProfileSSOT();
    const profileResult = await new JKHandler().sync(ssot);
    result.profileSync = {
      success: profileResult.success,
      changes: profileResult.changes?.length || 0,
    };
    log('profile sync done', result.profileSync);
    await shipToElk('profile_sync', result.profileSync);
  } catch (error) {
    log('profile sync failed', summarizeError(error));
    result.profileSync = { success: false, error: summarizeError(error) };
  }
}

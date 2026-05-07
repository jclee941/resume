import { run } from './command-runner.js';
import { log } from './logging.js';
import { checkSession } from './session-status.js';

export async function syncPlatform(platform) {
  const session = checkSession(platform);
  if (!session.valid) {
    log(`${platform}: Skipped (${session.reason})`, 'warn');
    return false;
  }

  log(`${platform}: Syncing...`, 'run');
  try {
    run(`npm run sync:platforms sync ${platform}`, { silent: true });
    log(`${platform}: Synced`, 'ok');
    return true;
  } catch (e) {
    log(`${platform}: Sync failed - ${e.message}`, 'err');
    return false;
  }
}

export async function syncPlatforms(platforms) {
  let synced = 0;
  for (const platform of platforms) {
    if (await syncPlatform(platform)) synced++;
  }
  return synced;
}

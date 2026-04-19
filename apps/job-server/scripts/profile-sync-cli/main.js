import JobKoreaHandler from '../profile-sync/jobkorea-handler.js';
import { CONFIG, PLATFORMS } from './config.js';
import { loadSSOT, log } from './common.js';
import { syncPlatformViaBrowser } from './browser-sync.js';
import { syncWantedViaAPI } from './wanted-sync.js';

async function syncPlatform(platformKey, ssot) {
  const config = PLATFORMS[platformKey];
  if (!config) {
    log(`Unknown platform: ${platformKey}`, 'error');
    return { success: false, changes: [] };
  }

  if (platformKey === 'wanted') {
    return syncWantedViaAPI(ssot);
  }

  if (platformKey === 'jobkorea') {
    const handler = new JobKoreaHandler();
    return handler.sync(ssot);
  }

  return syncPlatformViaBrowser(platformKey, ssot);
}

export async function runProfileSyncCli() {
  console.log('='.repeat(60));
  console.log('Profile Sync - SSOT to Job Platforms');
  console.log('='.repeat(60));

  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const targetPlatforms = args.length > 0 ? args : Object.keys(PLATFORMS);

  log(`Mode: ${CONFIG.APPLY ? 'APPLY' : 'DRY-RUN'}`);
  log(`Platforms: ${targetPlatforms.join(', ')}`);
  log(`Headless: ${CONFIG.HEADLESS}`);
  console.log('-'.repeat(60));

  const ssot = loadSSOT();

  const results = {};
  for (const platform of targetPlatforms) {
    if (!PLATFORMS[platform]) {
      log(`Skipping unknown platform: ${platform}`, 'warn');
      continue;
    }

    console.log(`\n${'='.repeat(40)}`);
    results[platform] = await syncPlatform(platform, ssot);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));

  for (const [platform, result] of Object.entries(results)) {
    const status = result.success ? 'OK' : 'FAIL';
    const changes = result.changes?.length || 0;
    const mode = result.dryRun ? '(dry-run)' : '';
    console.log(`  ${platform.padEnd(12)} ${status.padEnd(6)} ${changes} changes ${mode}`);
  }

  if (!CONFIG.APPLY) {
    console.log('\nRun with --apply to actually update profiles');
  }
}

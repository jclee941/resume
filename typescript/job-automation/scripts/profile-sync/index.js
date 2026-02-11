#!/usr/bin/env node
/**
 * Profile Sync Script - SSOT to Job Platforms
 *
 * Syncs resume_data.json (Single Source of Truth) to external job platforms:
 * - Wanted (wanted.co.kr) - Uses WantedAPI (no browser automation needed)
 * - JobKorea (jobkorea.co.kr) - Browser-based sync
 * - Saramin (saramin.co.kr) - Browser-based sync
 *
 * Usage:
 *   node profile-sync/index.js                    # Sync all platforms (dry-run)
 *   node profile-sync/index.js --apply            # Actually apply changes
 *   node profile-sync/index.js wanted --apply     # Sync specific platform
 *   node profile-sync/index.js --diff             # Show diff only
 *
 * Requires:
 *   - Active sessions for each platform (run auth-persistent.js first)
 *   - resume_data.json in typescript/data/resumes/master/
 */

import { CONFIG } from './constants.js';
import { log, loadSSOT } from './utils.js';
import WantedHandler from './wanted-handler.js';
import JobKoreaHandler from './jobkorea-handler.js';
import SaraminHandler from './saramin-handler.js';

/** Handler registry — maps platform key to handler instance */
const HANDLERS = {
  wanted: new WantedHandler(),
  jobkorea: new JobKoreaHandler(),
  saramin: new SaraminHandler(),
};

/**
 * Main entry point — parse CLI args and orchestrate platform syncs
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Profile Sync - SSOT to Job Platforms');
  console.log('='.repeat(60));

  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const targetPlatforms = args.length > 0 ? args : Object.keys(HANDLERS);

  log(`Mode: ${CONFIG.APPLY ? 'APPLY' : 'DRY-RUN'}`);
  log(`Platforms: ${targetPlatforms.join(', ')}`);
  log(`Headless: ${CONFIG.HEADLESS}`);
  console.log('-'.repeat(60));

  const ssot = loadSSOT();

  const results = {};
  for (const platform of targetPlatforms) {
    const handler = HANDLERS[platform];
    if (!handler) {
      log(`Skipping unknown platform: ${platform}`, 'warn');
      continue;
    }

    console.log('\n' + '='.repeat(40));
    results[platform] = await handler.sync(ssot);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
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

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

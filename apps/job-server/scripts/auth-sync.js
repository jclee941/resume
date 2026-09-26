#!/usr/bin/env node

import { PLATFORMS } from './auth-sync/config.js';
import { AuthSync } from './auth-sync-engine.js';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Multi-Platform Auth Sync Script

Usage:
  node auth-sync.js                      # All platforms (interactive)
  node auth-sync.js --platform wanted    # Specific platform
  node auth-sync.js --platform jobkorea  # JobKorea only
  node auth-sync.js --headless           # Headless mode
  node auth-sync.js --sync-only          # Sync existing sessions only

Platforms: wanted, jobkorea, saramin

Environment Variables:
  WANTED_EMAIL / WANTED_PASSWORD   - Wanted direct login
  GOOGLE_EMAIL / GOOGLE_PASSWORD   - Google OAuth
  JOB_WORKER_URL                   - Worker URL
  AUTH_SYNC_SECRET                 - Sync secret
`);
  process.exit(0);
}
let platforms = Object.keys(PLATFORMS);
const platformIdx = args.indexOf('--platform');
if (platformIdx !== -1 && args[platformIdx + 1]) {
  platforms = [args[platformIdx + 1]];
}
const options = {
  headless: args.includes('--headless'),
  syncOnly: args.includes('--sync-only'),
  platforms,
};
const sync = new AuthSync(options);
sync
  .run()
  .then((results) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 Authentication Sync Results');
    console.log('='.repeat(50));
    for (const [platform, session] of Object.entries(results)) {
      if (session) {
        console.log(
          `✅ ${platform.toUpperCase()}: ${session.email} (expires: ${session.expiresAt})`
        );
      } else {
        console.log(`❌ ${platform.toUpperCase()}: Failed`);
      }
    }
    const successCount = Object.values(results).filter(Boolean).length;
    process.exit(successCount > 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n[FATAL]', error.message);
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * Profile Sync Script - SSOT to Job Platforms
 *
 * Usage:
 *   node profile-sync.js                    # Sync all platforms (dry-run)
 *   node profile-sync.js --apply            # Actually apply changes
 *   node profile-sync.js wanted --apply     # Sync specific platform
 *   node profile-sync.js --diff             # Show diff only
 */

import { runProfileSyncCli } from './profile-sync-cli/main.js';

runProfileSyncCli().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

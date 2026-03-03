#!/usr/bin/env node

/**
 * CI Script: Sync resume to Wanted platform
 * Run directly without starting the Fastify server.
 *
 * Usage:
 *   node apps/job-server/scripts/ci-resume-sync.js
 *
 * Required env vars:
 *   WANTED_COOKIES   - Wanted authentication cookies
 *   WANTED_EMAIL     - Wanted account email
 *   WANTED_RESUME_ID - Wanted resume ID to sync
 *   DRY_RUN          - 'true' for preview only
 */

import { SessionManager } from '../src/tools/auth.js';
import { unifiedResumeSyncTool } from '../src/tools/unified-resume-sync.js';

const envVars = ['WANTED_COOKIES', 'WANTED_EMAIL', 'WANTED_RESUME_ID'];
const missing = envVars.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.error(`Error: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const wantedCookies = process.env.WANTED_COOKIES;
const wantedEmail = process.env.WANTED_EMAIL;
const wantedResumeId = process.env.WANTED_RESUME_ID;
const dryRun = process.env.DRY_RUN === 'true';

try {
  // Step 1: Save session
  SessionManager.save('wanted', {
    email: wantedEmail,
    cookies: wantedCookies,
    cookieString: wantedCookies,
    timestamp: Date.now(),
  });
  console.log('✅ Session saved successfully');

  // Step 2: Sync resume to Wanted
  const result = await unifiedResumeSyncTool.execute({
    action: 'sync',
    platforms: ['wanted'],
    dry_run: dryRun,
    resume_id: wantedResumeId,
  });

  console.log('Sync result:', JSON.stringify(result, null, 2));

  if (!result.success) {
    console.error('❌ Sync failed');
    process.exit(1);
  }

  console.log('✅ Resume sync completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

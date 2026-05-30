#!/usr/bin/env node
/**
 * Manual Cookie Import Script for JobKorea
 *
 * When automated login fails, manually extract cookies from browser and import them.
 *
 * Usage:
 *   1. Login to JobKorea in your browser manually
 *   2. Open DevTools (F12) → Network tab
 *   3. Refresh the page
 *   4. Click any request to www.jobkorea.co.kr
 *   5. Copy Cookie header value
 *   6. Run: node import-cookies-manual.js jobkorea "your_cookie_string_here"
 */

import fs from 'fs';
import path from 'path';
import { SessionManager } from '../src/shared/services/session/session-manager/index.js';
import { getResumeBasePath } from '../src/shared/utils/paths.js';

// Honor RESUME_BASE_PATH so the legacy per-platform file lands beside the
// canonical sessions.json (not hardcoded to the script's repo location).
const SESSION_DIR = getResumeBasePath();

const PLATFORM_DOMAINS = {
  jobkorea: '.jobkorea.co.kr',
  saramin: '.saramin.co.kr',
};

const SUPPORTED = new Set(Object.keys(PLATFORM_DOMAINS));

function parseCookieString(cookieString, domain) {
  const cookies = [];
  const parts = cookieString.split(';');

  for (const part of parts) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name) {
      cookies.push({
        name: name.trim(),
        value: valueParts.join('=').trim(),
        domain,
        path: '/',
      });
    }
  }

  return cookies;
}

function importCookies(platform, cookieString) {
  const cookies = parseCookieString(cookieString, PLATFORM_DOMAINS[platform]);

  // Validate critical cookies (jobkorea uses a `User` cookie carrying UID).
  const userCookie = cookies.find((c) => c.name === 'User');
  if (platform === 'jobkorea' && userCookie) {
    const uidMatch = userCookie.value.match(/UID=([^&]*)/);
    if (!uidMatch || !uidMatch[1]) {
      console.error('❌ Invalid User cookie - UID is empty. Please login again in browser.');
      process.exit(1);
    }
    console.log('✅ User cookie valid, UID:', uidMatch[1]);
  } else if (cookies.length === 0) {
    console.error('❌ No cookies parsed from the provided string.');
    process.exit(1);
  }

  const session = {
    platform,
    cookies,
    cookieString,
    cookieCount: cookies.length,
    extractedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // Canonical store: SessionManager reads the unified sessions.json. Write there
  // so the apply/profile-sync flow actually finds the freshly imported cookies.
  SessionManager.save(platform, session);

  // Backward-compatible per-platform file (legacy tooling still reads this).
  const legacyFile = path.join(SESSION_DIR, `${platform}-session.json`);
  fs.writeFileSync(legacyFile, JSON.stringify(session, null, 2));

  console.log(`✅ Saved ${cookies.length} cookies via SessionManager (sessions.json) + ${legacyFile}`);
  console.log('\n📝 Next steps:');
  console.log(`   1. Verify: node scripts/import-cookies-manual.js ${platform} --check`);
  console.log(
    `   2. Apply : node src/auto-apply/cli/index.js apply_queue --queue=<${platform}-queue.json> --apply --max=5`
  );
}

// CLI
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
Manual Cookie Import (jobkorea | saramin)

Usage:
  node import-cookies-manual.js <jobkorea|saramin> "your_cookie_string_here"
  node import-cookies-manual.js <jobkorea|saramin> --check

Steps:
  1. Login to https://www.jobkorea.co.kr or https://www.saramin.co.kr in your browser
  2. Open DevTools (F12) → Network tab
  3. Refresh the page (F5)
  4. Click any request to the site
  5. Copy the Cookie header value
  6. Run this script with the cookie string

Example:
  node import-cookies-manual.js jobkorea "User=UID=12345&Type=M; C_USER=UID=12345&DB_NAME=GG; ..."
  node import-cookies-manual.js saramin "_saramin_session=...; ..."
`);
  process.exit(0);
}

const [platform, cookieStringOrFlag] = args;

if (!SUPPORTED.has(platform)) {
  console.error(`❌ Unsupported platform '${platform}'. Supported: ${[...SUPPORTED].join(', ')}`);
  process.exit(1);
}

// --check verifies the canonical session is present and unexpired via SessionManager.
if (cookieStringOrFlag === '--check') {
  const health = SessionManager.checkHealth(platform);
  const session = SessionManager.load(platform);
  const cookieCount = session?.cookieCount ?? session?.cookies?.length ?? 0;
  console.log(`🔍 ${platform} session:`, JSON.stringify({ ...health, cookieCount }, null, 2));
  process.exit(health.valid ? 0 : 1);
}

try {
  importCookies(platform, cookieStringOrFlag);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}

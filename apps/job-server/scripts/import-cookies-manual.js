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
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.resolve(__dirname, '../../..');

function parseCookieString(cookieString) {
  const cookies = [];
  const parts = cookieString.split(';');

  for (const part of parts) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name) {
      cookies.push({
        name: name.trim(),
        value: valueParts.join('=').trim(),
        domain: '.jobkorea.co.kr',
        path: '/',
      });
    }
  }

  return cookies;
}

function importCookies(platform, cookieString) {
  const cookies = parseCookieString(cookieString);

  // Validate critical cookies
  const userCookie = cookies.find((c) => c.name === 'User');
  const cUserCookie = cookies.find((c) => c.name === 'C_USER' || c.name === 'C%5FUSER');

  if (userCookie) {
    const uidMatch = userCookie.value.match(/UID=([^&]*)/);
    if (!uidMatch || !uidMatch[1]) {
      console.error('❌ Invalid User cookie - UID is empty. Please login again in browser.');
      process.exit(1);
    }
    console.log('✅ User cookie valid, UID:', uidMatch[1]);
  } else {
    console.warn('⚠️  User cookie not found');
  }

  const session = {
    platform,
    cookies,
    cookieString,
    cookieCount: cookies.length,
    extractedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const sessionFile = path.join(SESSION_DIR, `${platform}-session.json`);
  fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));

  console.log(`✅ Saved ${cookies.length} cookies to ${sessionFile}`);
  console.log('\n📝 Next steps:');
  console.log('   1. Test with: node scripts/profile-sync.js jobkorea --diff');
  console.log('   2. Apply with: node scripts/profile-sync.js jobkorea --apply');
}

// CLI
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
Manual Cookie Import for JobKorea

Usage:
  node import-cookies-manual.js jobkorea "your_cookie_string_here"

Steps:
  1. Login to https://www.jobkorea.co.kr in your browser
  2. Open DevTools (F12) → Network tab
  3. Refresh the page (F5)
  4. Click any request to www.jobkorea.co.kr
  5. Copy Cookie header value
  6. Run this script with the cookie string

Example:
  node import-cookies-manual.js jobkorea "User=UID=12345&Type=M; C_USER=UID=12345&DB_NAME=GG; ..."
`);
  process.exit(0);
}

const [platform, cookieString] = args;

if (platform !== 'jobkorea') {
  console.error('❌ Only jobkorea platform is supported by this script');
  process.exit(1);
}

try {
  importCookies(platform, cookieString);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}

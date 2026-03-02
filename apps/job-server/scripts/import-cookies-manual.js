#!/usr/bin/env node
/**
 * Import cookies from browser DevTools.
 * 
 * Usage:
 * 1. Open wanted.co.kr in Chrome
 * 2. DevTools → Application → Cookies → wanted.co.kr
 * 3. Right-click → Copy all as JSON (or use EditThisCookie extension)
 * 4. Run: node scripts/import-cookies-manual.js wanted < cookies.json
 *    Or:  echo '[{...}]' | node scripts/import-cookies-manual.js wanted
 */
import {SessionManager} from '../src/shared/services/session/index.js';
import {createInterface} from 'readline';

const platform = process.argv[2] || 'wanted';

console.log(`\n🍪 Paste cookies JSON for ${platform}, then Ctrl+D:\n`);

let input = '';
const rl = createInterface({input: process.stdin});

rl.on('line', line => input += line);
rl.on('close', () => {
  try {
    const cookies = JSON.parse(input);
    if (!Array.isArray(cookies) || cookies.length === 0) {
      console.error('❌ Invalid JSON. Expected array of cookies.');
      process.exit(1);
    }

    // Normalize cookie format
    const normalized = cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      expires: c.expirationDate || c.expires || -1,
      httpOnly: c.httpOnly || false,
      secure: c.secure || false,
      sameSite: c.sameSite || 'Lax',
    }));

    const session = {
      platform,
      cookies: normalized,
      cookieString: normalized.map(c => `${c.name}=${c.value}`).join('; '),
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    SessionManager.save(platform, session);
    
    const authCookie = normalized.find(c => c.name.includes('TOKEN'));
    console.log(`\n✅ Imported ${normalized.length} cookies for ${platform}`);
    if (authCookie) {
      console.log(`   Auth: ${authCookie.name}`);
    }
    console.log(`   File: ~/.OpenCode/data/${platform}-session.json`);
  } catch (e) {
    console.error('❌ Parse error:', e.message);
    process.exit(1);
  }
});

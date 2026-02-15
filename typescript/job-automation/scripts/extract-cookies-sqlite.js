#!/usr/bin/env node
import Database from 'better-sqlite3';
import {execSync} from 'child_process';
import {createDecipheriv, pbkdf2Sync} from 'crypto';
import {copyFileSync, unlinkSync, existsSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';
import {SessionManager} from '../src/shared/services/session/index.js';

const PLATFORMS = {
  wanted: {name: 'Wanted', domain: 'wanted.co.kr'},
  jobkorea: {name: 'JobKorea', domain: 'jobkorea.co.kr'},
  saramin: {name: 'Saramin', domain: 'saramin.co.kr'},
  linkedin: {name: 'LinkedIn', domain: 'linkedin.com'},
  remember: {name: 'Remember', domain: 'rememberapp.co.kr'},
};

const CHROME_COOKIES_PATH =
  process.env.CHROME_COOKIES_PATH ||
  `${process.env.HOME}/.config/google-chrome/Default/Cookies`;

function getDecryptionKey() {
  try {
    const keyBuffer = execSync(
      'secret-tool lookup application chrome xdg:schema chrome_libsecret_os_crypt_password_v2',
      {encoding: 'buffer', stdio: ['pipe', 'pipe', 'ignore']}
    );
    const keyStr = keyBuffer.toString('utf-8').replace(/\n$/, '');
    return pbkdf2Sync(keyStr, 'saltysalt', 1, 16, 'sha1');
  } catch {
    try {
      const keyBuffer = execSync(
        'secret-tool lookup application chromium xdg:schema chrome_libsecret_os_crypt_password_v2',
        {encoding: 'buffer', stdio: ['pipe', 'pipe', 'ignore']}
      );
      const keyStr = keyBuffer.toString('utf-8').replace(/\n$/, '');
      return pbkdf2Sync(keyStr, 'saltysalt', 1, 16, 'sha1');
    } catch {
      return pbkdf2Sync('peanuts', 'saltysalt', 1, 16, 'sha1');
    }
  }
}

function decryptValue(encryptedValue, key) {
  if (!encryptedValue || encryptedValue.length < 4) return '';

  const prefix = encryptedValue.slice(0, 3).toString('utf-8');
  if (prefix === 'v10' || prefix === 'v11') {
    try {
      const iv = Buffer.alloc(16, ' ');
      const encrypted = encryptedValue.slice(3);

      const decipher = createDecipheriv('aes-128-cbc', key, iv);
      decipher.setAutoPadding(false);

      let decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      const padding = decrypted[decrypted.length - 1];
      if (padding > 0 && padding <= 16) {
        decrypted = decrypted.slice(0, -padding);
      }

      let start = 0;
      for (let i = 0; i < decrypted.length; i++) {
        const b = decrypted[i];
        if (b >= 0x20 && b <= 0x7e) {
          start = i;
          break;
        }
      }
      return decrypted.slice(start).toString('utf-8');
    } catch {
      return '';
    }
  }
  return encryptedValue.toString('utf-8');
}

function extractCookies(platformKeys = Object.keys(PLATFORMS)) {
  console.log('\n' + '='.repeat(50));
  console.log('🔑 Chrome SQLite Cookie Extractor');
  console.log('='.repeat(50));

  if (!existsSync(CHROME_COOKIES_PATH)) {
    console.error(`❌ Cookies DB not found: ${CHROME_COOKIES_PATH}`);
    process.exit(1);
  }

  const tmpPath = join(tmpdir(), `chrome_cookies_${Date.now()}.db`);
  copyFileSync(CHROME_COOKIES_PATH, tmpPath);

  const db = new Database(tmpPath, {readonly: true});
  const key = getDecryptionKey();

  console.log(`\n📂 Reading: ${CHROME_COOKIES_PATH}`);

  const results = {};

  for (const platformKey of platformKeys) {
    const platform = PLATFORMS[platformKey];
    if (!platform) {
      console.log(`⚠️  Unknown platform: ${platformKey}`);
      continue;
    }

    console.log(`\n🔍 ${platform.name} (${platform.domain})...`);

    const rows = db
      .prepare(
        `SELECT host_key, name, encrypted_value, path, expires_utc, is_secure, is_httponly, samesite
       FROM cookies WHERE host_key LIKE ?`
      )
      .all(`%${platform.domain}`);

    if (rows.length === 0) {
      console.log('   ❌ No cookies found');
      results[platformKey] = false;
      continue;
    }

    const cookies = rows
      .map(row => ({
        name: row.name,
        value: decryptValue(row.encrypted_value, key),
        domain: row.host_key,
        path: row.path,
        expires:
          row.expires_utc > 0 ? row.expires_utc / 1000000 - 11644473600 : -1,
        secure: !!row.is_secure,
        httpOnly: !!row.is_httponly,
        sameSite: ['None', 'Lax', 'Strict'][row.samesite] || 'None',
      }))
      .filter(c => c.value);

    if (cookies.length === 0) {
      console.log('   ❌ All cookies empty (decryption failed?)');
      results[platformKey] = false;
      continue;
    }

    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const email = extractEmail(platformKey, cookies);

    SessionManager.save(platformKey, {
      cookies,
      cookieString,
      email,
      timestamp: Date.now(),
    });

    console.log(`   ✅ Saved ${cookies.length} cookies (${email})`);
    results[platformKey] = true;
  }

  db.close();
  unlinkSync(tmpPath);

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary');
  console.log('='.repeat(50));
  for (const [key, success] of Object.entries(results)) {
    console.log(`   ${success ? '✅' : '❌'} ${PLATFORMS[key]?.name || key}`);
  }
}

function extractEmail(platformKey, cookies) {
  const find = name => cookies.find(c => c.name === name)?.value;

  if (platformKey === 'wanted') {
    const ab = find('airbridge_user');
    if (ab) {
      try {
        const d = JSON.parse(decodeURIComponent(ab));
        if (d.externalUserID) return `user_${d.externalUserID}`;
      } catch {}
    }
  } else if (platformKey === 'jobkorea') {
    return find('M_ID') || 'unknown';
  } else if (platformKey === 'saramin') {
    const m = find('sri_m_idx');
    return m ? `saramin_${m}` : 'unknown';
  } else if (platformKey === 'linkedin') {
    return find('li_at') ? 'linkedin_authenticated' : 'unknown';
  }
  return 'unknown';
}

const args = process.argv.slice(2);
if (args[0] === '--help' || args[0] === '-h') {
  console.log(`
Chrome SQLite Cookie Extractor (Headless)

Usage:
  node scripts/extract-cookies-sqlite.js              # All platforms
  node scripts/extract-cookies-sqlite.js jobkorea saramin  # Specific platforms

Platforms: ${Object.keys(PLATFORMS).join(', ')}

Environment:
  CHROME_COOKIES_PATH   Chrome cookies DB (default: ~/.config/google-chrome/Default/Cookies)
`);
  process.exit(0);
}

extractCookies(args.length > 0 ? args : undefined);

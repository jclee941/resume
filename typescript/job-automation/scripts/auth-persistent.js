#!/usr/bin/env node
/**
 * Persistent Auth Script - Real automation using saved browser state
 *
 * How it works:
 * 1. First run: Opens browser, you login manually ONCE
 * 2. Browser state (cookies, localStorage) saved to disk
 * 3. Future runs: Automatically logged in, no manual action needed
 *
 * Usage:
 *   node auth-persistent.js jobkorea    # First time: manual login, then auto
 *   node auth-persistent.js saramin     # Same for Saramin
 *   node auth-persistent.js wanted      # Wanted (also works)
 *   node auth-persistent.js --sync      # Sync all saved sessions to Worker
 *   node auth-persistent.js --reset jobkorea  # Clear saved state, login again
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  USER_DATA_DIR: path.join(process.env.HOME || '/tmp', '.opencode/browser-data'),
  SESSION_DIR: path.join(process.env.HOME || '/tmp', '.opencode/data'),
  JOB_WORKER_URL: process.env.JOB_WORKER_URL || 'https://resume.jclee.me/job',
  AUTH_SYNC_SECRET: process.env.AUTH_SYNC_SECRET,
};

const PLATFORMS = {
  wanted: {
    name: 'Wanted',
    loginUrl: 'https://id.wanted.jobs/login',
    checkUrl: 'https://www.wanted.co.kr/cv/list',
    successIndicator: '/cv/', // URL contains this when logged in
    cookieDomains: ['wanted.co.kr', 'id.wanted.jobs'],
  },
  jobkorea: {
    name: 'JobKorea',
    loginUrl: 'https://www.jobkorea.co.kr/Login/Login_Tot.asp',
    checkUrl: 'https://www.jobkorea.co.kr/User/Mng/Resume/ResumeList',
    successIndicator: '/User/', // URL contains this when logged in
    cookieDomains: ['jobkorea.co.kr'],
  },
  saramin: {
    name: 'Saramin',
    loginUrl: 'https://www.saramin.co.kr/zf_user/auth',
    checkUrl: 'https://www.saramin.co.kr/zf_user/member/info',
    successIndicator: '/member/', // URL contains this when logged in
    cookieDomains: ['saramin.co.kr'],
  },
};

function log(msg, type = 'info', platform = null) {
  const prefix = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' }[type] || '📝';
  const tag = platform ? `[${platform.toUpperCase()}]` : '';
  console.log(`${new Date().toISOString()} ${prefix} ${tag} ${msg}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runPlatform(platformKey, reset = false) {
  const platform = PLATFORMS[platformKey];
  if (!platform) {
    log(`Unknown platform: ${platformKey}`, 'error');
    return null;
  }

  const userDataDir = path.join(CONFIG.USER_DATA_DIR, platformKey);

  // Reset if requested
  if (reset && fs.existsSync(userDataDir)) {
    log('Resetting browser state...', 'info', platformKey);
    fs.rmSync(userDataDir, { recursive: true });
  }

  // Ensure directory exists
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  log('Launching browser with persistent context...', 'info', platformKey);

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Must be visible for first-time login
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    // Check if already logged in
    log('Checking login status...', 'info', platformKey);
    await page.goto(platform.checkUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await sleep(3000);

    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes(platform.successIndicator);

    if (isLoggedIn) {
      log('Already logged in!', 'success', platformKey);
    } else {
      // Need to login
      log('Not logged in. Opening login page...', 'info', platformKey);
      await page.goto(platform.loginUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      log('👆 Please complete login in the browser', 'warn', platformKey);
      log('Waiting for login (max 3 minutes)...', 'info', platformKey);

      // Wait for login
      const startTime = Date.now();
      const timeout = 180000;

      while (Date.now() - startTime < timeout) {
        await sleep(3000);

        try {
          await page.goto(platform.checkUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 10000,
          });
          await sleep(2000);

          if (page.url().includes(platform.successIndicator)) {
            log('Login successful! State saved for future runs.', 'success', platformKey);
            break;
          }
        } catch {
          // Navigation might fail, continue waiting
        }

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed % 15 === 0) {
          log(`Still waiting... (${elapsed}s)`, 'info', platformKey);
        }
      }
    }

    // Extract cookies
    log('Extracting cookies...', 'info', platformKey);
    const cookies = await context.cookies();
    const relevantCookies = cookies.filter((c) =>
      platform.cookieDomains.some((d) => c.domain.includes(d))
    );

    if (relevantCookies.length === 0) {
      log('No cookies found. Login may have failed.', 'error', platformKey);
      return null;
    }

    const cookieString = relevantCookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const session = {
      platform: platformKey,
      cookies: cookieString,
      cookieCount: relevantCookies.length,
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    // Save to file
    if (!fs.existsSync(CONFIG.SESSION_DIR)) {
      fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
    }
    const sessionFile = path.join(CONFIG.SESSION_DIR, `${platformKey}-session.json`);
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
    log(`Saved ${relevantCookies.length} cookies to ${sessionFile}`, 'success', platformKey);

    return session;
  } finally {
    await context.close();
    log('Browser closed', 'info', platformKey);
  }
}

async function syncToWorker(session) {
  if (!session?.cookies) return false;

  log('Syncing to Worker...', 'info', session.platform);

  try {
    const response = await fetch(`${CONFIG.JOB_WORKER_URL}/api/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Sync-Secret': CONFIG.AUTH_SYNC_SECRET || '',
      },
      body: JSON.stringify({
        platform: session.platform,
        cookies: session.cookies,
        expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log('Synced to Worker', 'success', session.platform);
      return true;
    } else {
      log(`Sync failed: ${result.error || response.status}`, 'error', session.platform);
      return false;
    }
  } catch (e) {
    log(`Sync error: ${e.message}`, 'error', session.platform);
    return false;
  }
}

async function syncAllSessions() {
  log('Syncing all saved sessions to Worker...');

  for (const platformKey of Object.keys(PLATFORMS)) {
    const sessionFile = path.join(CONFIG.SESSION_DIR, `${platformKey}-session.json`);

    if (fs.existsSync(sessionFile)) {
      try {
        const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));

        // Check if expired
        if (new Date(session.expiresAt) < new Date()) {
          log('Session expired', 'warn', platformKey);
          continue;
        }

        await syncToWorker(session);
      } catch (e) {
        log(`Failed to load session: ${e.message}`, 'error', platformKey);
      }
    } else {
      log('No saved session', 'warn', platformKey);
    }
  }
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(`
Persistent Auth - Login once, auto-login forever

Usage:
  node auth-persistent.js <platform>           # Login to platform
  node auth-persistent.js --reset <platform>   # Clear state and re-login
  node auth-persistent.js --sync               # Sync all sessions to Worker
  node auth-persistent.js --status             # Show saved session status

Platforms: wanted, jobkorea, saramin

First run: Browser opens, login manually. State saved automatically.
Next runs: Already logged in, just extracts cookies.
`);
  process.exit(0);
}

if (args.includes('--sync')) {
  syncAllSessions().then(() => process.exit(0));
} else if (args.includes('--status')) {
  console.log('\n📊 Saved Sessions:\n');
  for (const [key, platform] of Object.entries(PLATFORMS)) {
    const sessionFile = path.join(CONFIG.SESSION_DIR, `${key}-session.json`);
    if (fs.existsSync(sessionFile)) {
      const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      const expired = new Date(session.expiresAt) < new Date();
      console.log(
        `${expired ? '❌' : '✅'} ${platform.name}: ${session.cookieCount} cookies, expires ${session.expiresAt}`
      );
    } else {
      console.log(`⚪ ${platform.name}: No session`);
    }
  }
  console.log('');
  process.exit(0);
} else {
  const reset = args.includes('--reset');
  const platformKey = args.find((a) => !a.startsWith('--'));

  if (!platformKey || !PLATFORMS[platformKey]) {
    console.error('Invalid platform. Use: wanted, jobkorea, saramin');
    process.exit(1);
  }

  runPlatform(platformKey, reset)
    .then(async (session) => {
      if (session) {
        await syncToWorker(session);
      }
      process.exit(session ? 0 : 1);
    })
    .catch((e) => {
      console.error('Error:', e.message);
      process.exit(1);
    });
}

#!/usr/bin/env node
/**
 * Unified Automation Runner
 * Runs all automation tasks: cookie extraction, platform sync, verification
 *
 * Usage: node scripts/auto-all.js [--extract] [--sync] [--verify] [--all]
 */
import { execSync } from 'child_process';
import { SessionManager } from '../src/shared/services/session/index.js';
import WebSocket from 'ws';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PLATFORMS = ['wanted', 'jobkorea', 'remember'];
const CHROME_DEBUG_PORT = 9222;

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, type = 'info') {
  const icons = { info: '→', ok: '✓', err: '✗', warn: '⚠', run: '▶' };
  const colors = { info: c.cyan, ok: c.green, err: c.red, warn: c.yellow, run: c.blue };
  console.log(`${colors[type]}${icons[type]}${c.reset} ${msg}`);
}

function header(title) {
  console.log(`\n${c.bold}━━━ ${title} ━━━${c.reset}\n`);
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
  } catch (e) {
    if (!opts.ignoreError) throw e;
    return null;
  }
}

// Check if Chrome DevTools is available
async function checkChromeDevTools() {
  try {
    const res = await fetch(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/version`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Extract cookies via Chrome DevTools Protocol (WebSocket-based)
async function extractCookiesViaCDP(platforms) {
  const PLATFORM_DOMAINS = {
    wanted: ['.wanted.co.kr', 'wanted.co.kr'],
    jobkorea: ['.jobkorea.co.kr', 'jobkorea.co.kr'],
    remember: ['.rememberapp.co.kr', 'rememberapp.co.kr'],
  };

  try {
    // Get WebSocket debugger URL from Chrome
    const verRes = await fetch(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/version`, {
      signal: AbortSignal.timeout(3000),
    });
    const { webSocketDebuggerUrl: wsUrl } = await verRes.json();
    if (!wsUrl) {
      log('No WebSocket URL from Chrome DevTools', 'warn');
      return 0;
    }

    // Connect WebSocket
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    // Send CDP command helper
    const cdpSend = (method, params = {}) => new Promise((resolve, reject) => {
      const id = Date.now() + Math.random();
      const timeout = setTimeout(() => reject(new Error('CDP timeout')), 5000);
      const handler = (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.id === id) {
          clearTimeout(timeout);
          ws.off('message', handler);
          msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

    // Get all cookies from browser
    const { cookies } = await cdpSend('Network.getAllCookies');
    log(`Retrieved ${cookies.length} total cookies from Chrome`, 'ok');

    let saved = 0;
    for (const platform of platforms) {
      const domains = PLATFORM_DOMAINS[platform];
      if (!domains) continue;

      const platformCookies = cookies.filter((c) =>
        domains.some((d) => c.domain.includes(d.replace('.', '')))
      );

      if (platformCookies.length === 0) {
        log(`${platform}: No cookies found (not logged in?)`, 'warn');
        continue;
      }

      const session = {
        platform,
        cookies: platformCookies.map((c) => ({
          name: c.name, value: c.value, domain: c.domain,
          path: c.path, expires: c.expires, httpOnly: c.httpOnly,
          secure: c.secure, sameSite: c.sameSite,
        })),
        cookieString: platformCookies.map((c) => `${c.name}=${c.value}`).join('; '),
        cookieCount: platformCookies.length,
        extractedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      SessionManager.save(platform, session);
      // Also write platform-specific session file (JobKorea/Remember read these)
      const platformSessionDir = join(homedir(), '.opencode', 'data');
      if (!existsSync(platformSessionDir)) mkdirSync(platformSessionDir, { recursive: true });
      const platformSessionPath = join(platformSessionDir, `${platform}-session.json`);
      writeFileSync(platformSessionPath, JSON.stringify(session, null, 2));
      log(`${platform}: Saved ${platformCookies.length} cookies via CDP`, 'ok');
      saved++;
    }

    ws.close();
    return saved;
  } catch (e) {
    log(`CDP extraction error: ${e.message}`, 'err');
    return 0;
  }
}

// Check session validity
function checkSession(platform) {
  const session = SessionManager.load(platform);
  if (!session) return { valid: false, reason: 'no session' };
  if (!session || !session.timestamp || Date.now() - session.timestamp > 24 * 60 * 60 * 1000)
    return { valid: false, reason: 'expired' };

  const cookieArr = Array.isArray(session.cookies) ? session.cookies : [];
  const cookieStr = session.cookieString || (typeof session.cookies === 'string' ? session.cookies : '');

  const hasAuth = cookieArr.length > 0
    ? cookieArr.some((c) => c.name.includes('TOKEN') || c.name.includes('session') || c.name.includes('auth'))
    : /TOKEN|session|auth/i.test(cookieStr);
  if (!hasAuth) return { valid: false, reason: 'no auth cookie' };

  return { valid: true, cookies: session.cookieCount || cookieArr.length || cookieStr.split(';').filter(Boolean).length };
}

// Sync to platform
async function syncPlatform(platform) {
  const session = checkSession(platform);
  if (!session.valid) {
    log(`${platform}: Skipped (${session.reason})`, 'warn');
    return false;
  }

  log(`${platform}: Syncing...`, 'run');
  try {
    run(`npm run sync:platforms sync ${platform}`, { silent: true });
    log(`${platform}: Synced`, 'ok');
    return true;
  } catch (e) {
    log(`${platform}: Sync failed - ${e.message}`, 'err');
    return false;
  }
}

// Main automation
async function main() {
  const args = process.argv.slice(2);
  const doAll = args.includes('--all') || args.length === 0;
  const doExtract = doAll || args.includes('--extract');
  const doSync = doAll || args.includes('--sync');
  const doVerify = doAll || args.includes('--verify');

  console.log(`\n${c.bold}╔══════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}║     Resume Automation Runner         ║${c.reset}`);
  console.log(`${c.bold}╚══════════════════════════════════════╝${c.reset}`);

  // Step 1: Check/Extract Cookies
  if (doExtract) {
    header('Cookie Status');

    const cdpAvailable = await checkChromeDevTools();
    if (cdpAvailable) {
      log(`Chrome DevTools available on port ${CHROME_DEBUG_PORT}`, 'ok');
    } else {
      log('Chrome DevTools not available. Start Chrome with:', 'warn');
      console.log(`   google-chrome --remote-debugging-port=${CHROME_DEBUG_PORT}`);
    }

    // Check each platform status
    const invalidPlatforms = [];
    for (const platform of PLATFORMS) {
      const status = checkSession(platform);
      if (status.valid) {
        log(`${platform}: Valid session (${status.cookies} cookies)`, 'ok');
      } else {
        log(`${platform}: ${status.reason}`, 'err');
        invalidPlatforms.push(platform);
      }
    }

    // Attempt CDP extraction for all invalid platforms at once
    if (invalidPlatforms.length > 0 && cdpAvailable) {
      log(`Attempting CDP extraction for: ${invalidPlatforms.join(', ')}...`, 'run');
      const saved = await extractCookiesViaCDP(invalidPlatforms);
      log(`Extracted cookies for ${saved} platform(s)`, saved > 0 ? 'ok' : 'warn');

      // Re-check after extraction
      for (const platform of invalidPlatforms) {
        const recheck = checkSession(platform);
        if (recheck.valid) {
          log(`${platform}: Session restored (${recheck.cookies} cookies)`, 'ok');
        }
      }
    } else if (invalidPlatforms.length > 0) {
      // CDP unavailable — try SessionManager.tryRefresh() for each platform
      log('CDP unavailable, attempting session refresh...', 'run');
      for (const platform of invalidPlatforms) {
        const refreshed = await SessionManager.tryRefresh(platform);
        if (refreshed) {
          log(`${platform}: Session refreshed via tryRefresh()`, 'ok');
        } else {
          log(`${platform}: Could not refresh session`, 'warn');
        }
      }
    }
  }

  // Pre-flight: warn if no platforms are authenticated
  const authCount = PLATFORMS.filter((p) => checkSession(p).valid).length;
  if (authCount === 0) {
    log('WARNING: No platforms authenticated. Operations will fail.', 'err');
    log('Run: node scripts/extract-cookies-cdp.js (with Chrome open)', 'info');
    log('  Or: node scripts/auth-persistent.js wanted (interactive login)', 'info');
  }

  // Step 2: Sync Platforms
  if (doSync) {
    header('Platform Sync');

    let synced = 0;
    for (const platform of PLATFORMS) {
      if (await syncPlatform(platform)) synced++;
    }

    log(`Synced ${synced}/${PLATFORMS.length} platforms`, synced > 0 ? 'ok' : 'warn');
  }

  // Step 3: Verify
  if (doVerify) {
    header('Verification');

    // Build
    log('Building worker.js...', 'run');
    try {
      run('npm run build', { cwd: '..', silent: true });
      log('Build successful', 'ok');
    } catch {
      log('Build failed', 'err');
    }

    // LSP diagnostics on key files
    log('Checking for errors...', 'run');
    try {
      const result = run('npx tsc --noEmit 2>&1 || true', { silent: true });
      if (result?.includes('error')) {
        log('TypeScript errors found', 'warn');
      } else {
        log('No TypeScript errors', 'ok');
      }
    } catch {
      log('TypeScript check skipped', 'warn');
    }
  }

  // Step 4: Summary & Notification
  header('Summary');
  const summaryData = {};
  for (const platform of PLATFORMS) {
    const status = checkSession(platform);
    const icon = status.valid ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    console.log(`  ${icon} ${platform}`);
    summaryData[platform] = { valid: status.valid, cookies: status.cookies || 0 };
  }
  console.log('');

  // Send n8n webhook notification if configured
  const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.jclee.me/webhook/automation-run-report';
  if (webhookUrl) {
    try {
      const payload = {
        event: 'automation-run',
        timestamp: new Date().toISOString(),
        platforms: summaryData,
        actions: { extract: doExtract, sync: doSync, verify: doVerify },
      };
      const headers = { 'Content-Type': 'application/json' };
      const secret = process.env.N8N_WEBHOOK_SECRET;
      if (secret) {
        const { createHmac } = await import('crypto');
        headers['X-Webhook-Signature'] = createHmac('sha256', secret)
          .update(JSON.stringify(payload))
          .digest('hex');
      }
      await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      log('Webhook notification sent', 'ok');
    } catch (e) {
      log(`Webhook failed: ${e.message}`, 'warn');
    }
  }
}

main().catch(console.error);

#!/usr/bin/env node
/**
 * Unified Automation Runner
 * Runs all automation tasks: cookie extraction, platform sync, verification
 *
 * Usage: node scripts/auto-all.js [--extract] [--sync] [--verify] [--all]
 */
import { execSync } from 'child_process';
import { SessionManager } from '../src/shared/services/session/index.js';

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

// Extract cookies via Chrome DevTools Protocol
async function extractCookiesViaCDP(_platform) {
  const _domains = {
    wanted: ['.wanted.co.kr', 'www.wanted.co.kr'],
    jobkorea: ['.jobkorea.co.kr', 'www.jobkorea.co.kr'],
    remember: ['.rememberapp.co.kr', 'www.rememberapp.co.kr'],
  };

  try {
    // Get all cookies via CDP
    const res = await fetch(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/list`);
    const pages = await res.json();

    if (pages.length === 0) {
      log('No Chrome pages found', 'warn');
      return null;
    }

    // Connect to first page's WebSocket
    const wsUrl = pages[0].webSocketDebuggerUrl;
    if (!wsUrl) {
      log('No WebSocket URL available', 'warn');
      return null;
    }

    // Use CDP to get cookies (via HTTP endpoint)
    const _cookieRes = await fetch(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/protocol`);

    // Fallback: try to get cookies from Network domain
    // This is a simplified approach - full CDP would use WebSocket
    log('CDP available but cookie extraction needs WebSocket client', 'warn');
    return null;
  } catch (e) {
    log(`CDP error: ${e.message}`, 'err');
    return null;
  }
}

// Check session validity
function checkSession(platform) {
  const session = SessionManager.load(platform);
  if (!session) return { valid: false, reason: 'no session' };
  if (!session || !session.timestamp || Date.now() - session.timestamp > 24 * 60 * 60 * 1000)
    return { valid: false, reason: 'expired' };

  const authCookie = session.cookies?.find(
    (c) => c.name.includes('TOKEN') || c.name.includes('session')
  );
  if (!authCookie) return { valid: false, reason: 'no auth cookie' };

  return { valid: true, cookies: session.cookies.length };
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

    for (const platform of PLATFORMS) {
      const status = checkSession(platform);
      if (status.valid) {
        log(`${platform}: Valid session (${status.cookies} cookies)`, 'ok');
      } else {
        log(`${platform}: ${status.reason}`, 'err');

        if (cdpAvailable) {
          log(`Attempting CDP extraction for ${platform}...`, 'run');
          await extractCookiesViaCDP(platform);
        }
      }
    }
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

  header('Summary');
  for (const platform of PLATFORMS) {
    const status = checkSession(platform);
    const icon = status.valid ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    console.log(`  ${icon} ${platform}`);
  }
  console.log('');
}

main().catch(console.error);

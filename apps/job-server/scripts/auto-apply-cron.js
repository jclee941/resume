#!/usr/bin/env node
/**
 * Cron wrapper for auto-apply pipeline.
 *
 * Handles:
 * - Session health check and refresh attempts
 * - Auto-apply execution with configurable limits
 * - Structured logging to ~/.opencode/data/wanted-logs/
 * - Graceful failure with exit codes
 *
 * Usage:
 *   node scripts/auto-apply-cron.js                   # dry run, default limits
 *   node scripts/auto-apply-cron.js --apply            # real apply
 *   node scripts/auto-apply-cron.js --apply --max=5    # real apply, max 5
 *
 * Crontab example (daily 9 AM KST):
 *   0 9 * * * cd /home/jclee/dev/resume/apps/job-server && node scripts/auto-apply-cron.js --apply --max=5
 */
import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const LOG_DIR = join(homedir(), '.opencode', 'data', 'wanted-logs');
const ENV_FILE = join(PROJECT_ROOT, '.env');
const CLI_PATH = join(PROJECT_ROOT, 'src', 'auto-apply', 'cli.js');

const args = process.argv.slice(2);
const realApply = args.includes('--apply');
const maxFlag = args.find((a) => a.startsWith('--max='));
const maxApply = maxFlag ? parseInt(maxFlag.split('=')[1], 10) : 5;

mkdirSync(LOG_DIR, { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const logFile = join(LOG_DIR, `auto-apply-${today}.log`);

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  appendFileSync(logFile, `${line}\n`);
}

function loadEnv() {
  if (!existsSync(ENV_FILE)) return;
  try {
    const content = readFileSync(ENV_FILE, 'utf8');
    content.split('\n').forEach((line) => {
      if (line.startsWith('#') || !line.includes('=')) return;
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
      }
    });
    log('Loaded .env');
  } catch (e) {
    log(`WARN: Failed to parse .env: ${e.message}`);
  }
}

async function checkSessionHealth() {
  try {
    const result = execSync(
      `node -e "
        import { SessionManager } from './src/shared/services/session/index.js';
        const h = SessionManager.checkHealth('wanted', 2 * 60 * 60 * 1000, true);
        console.log(JSON.stringify(h));
      "`,
      { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'pipe', timeout: 10000 }
    );
    return JSON.parse(result.trim());
  } catch (e) {
    log(`WARN: Session health check failed: ${e.message}`);
    return { valid: false, expiringSoon: false, expiresAt: null };
  }
}

function buildWantedOneIdLoginUrl(clientId) {
  const url = new URL('https://id.wanted.co.kr/login');
  url.searchParams.set('service', 'wanted');
  url.searchParams.set('before_url', 'https://www.wanted.co.kr/');
  url.searchParams.set('client_id', clientId);
  return url.toString();
}

async function mintWantedCookies(email, password, clientId) {
  const response = await fetch('https://id-api.wanted.co.kr/v1/auth/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: 'https://id.wanted.co.kr',
      Referer: buildWantedOneIdLoginUrl(clientId),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'oneid-agent': 'web',
    },
    body: JSON.stringify({
      grant_type: 'password',
      email,
      password,
      client_id: clientId,
      beforeUrl: 'https://www.wanted.co.kr/',
      redirect_url: null,
      stay_signed_in: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OneID token request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const payload = await response.json();
  const token = payload?.token;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('OneID token response did not include a usable token');
  }

  return `WWW_ONEID_ACCESS_TOKEN=${token}`;
}

async function attemptSessionRefresh() {
  // Strategy 0: OneID API login (no browser required, fastest)
  if (process.env.WANTED_PASSWORD && process.env.WANTED_ONEID_CLIENT_ID) {
    log('Attempting session refresh via OneID API...');
    try {
      const email = process.env.WANTED_EMAIL || 'qws941@kakao.com';
      const cookieString = await mintWantedCookies(
        email,
        process.env.WANTED_PASSWORD,
        process.env.WANTED_ONEID_CLIENT_ID
      );

      const result = execSync(
        `node --input-type=module -e "
          import { SessionManager } from './src/shared/services/session/index.js';
          SessionManager.save('wanted', {
            email: '${email}',
            cookies: '${cookieString}',
            cookieString: '${cookieString}',
          });
          const h = SessionManager.checkHealth('wanted', 2 * 60 * 60 * 1000, true);
          console.log(JSON.stringify(h));
        "`,
        { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'pipe', timeout: 10000 }
      );
      const health = JSON.parse(result.trim());
      if (health.valid) {
        log('Session refreshed via OneID API');
        return true;
      }
    } catch (e) {
      log(`WARN: OneID API login failed: ${e.message}`);
    }
  }

  // Strategy 1: Quick login (requires WANTED_PASSWORD, uses Puppeteer browser)
  if (process.env.WANTED_PASSWORD) {
    log('Attempting session refresh via quick-login...');
    try {
      const quickLogin = join(PROJECT_ROOT, 'scripts', 'quick-login.js');
      execSync(`node ${quickLogin}`, {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000,
        env: { ...process.env },
      });
      const health = await checkSessionHealth();
      if (health.valid) {
        log('Session refreshed via quick-login');
        return true;
      }
    } catch (e) {
      log(`WARN: quick-login failed: ${e.message}`);
    }
  }

  // Strategy 2: CDP extraction (requires Chrome with --remote-debugging-port=9222)
  log('Attempting session refresh via CDP extraction...');
  try {
    const cdpScript = join(PROJECT_ROOT, 'scripts', 'extract-cookies-cdp.js');
    execSync(`node ${cdpScript} wanted`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 15000,
    });
    const health = await checkSessionHealth();
    if (health.valid) {
      log('Session refreshed via CDP extraction');
      return true;
    }
  } catch {
    log('WARN: CDP extraction unavailable (Chrome not running with remote debugging)');
  }

  return false;
}

async function runAutoApply() {
  const cliArgs = ['apply', `--max=${maxApply}`];
  if (realApply) cliArgs.push('--apply');

  log(`Running auto-apply: node ${CLI_PATH} ${cliArgs.join(' ')}`);

  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...cliArgs], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' },
      stdio: 'pipe',
      timeout: 120000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      appendFileSync(logFile, text);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      appendFileSync(logFile, `[STDERR] ${text}`);
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', (err) => {
      log(`ERROR: spawn failed: ${err.message}`);
      resolve({ code: 1, stdout, stderr: err.message });
    });
  });
}

async function main() {
  log('=== Auto-Apply Cron Start ===');
  log(`Mode: ${realApply ? 'REAL APPLY' : 'DRY RUN'}, Max: ${maxApply}`);

  loadEnv();

  const health = await checkSessionHealth();
  log(
    `Session health: valid=${health.valid}, expiringSoon=${health.expiringSoon}, expiresAt=${health.expiresAt}`
  );

  if (!health.valid) {
    log('Session expired. Attempting refresh...');
    const refreshed = await attemptSessionRefresh();
    if (!refreshed) {
      log(
        'WARN: Session refresh failed. Auto-apply will proceed without auth (search-only, no real apply possible).'
      );
      if (realApply) {
        log('ERROR: Cannot real-apply without valid session. Switching to dry-run.');
      }
    }
  } else if (health.expiringSoon) {
    log('Session expiring soon. Attempting preemptive refresh...');
    await attemptSessionRefresh();
  }

  const result = await runAutoApply();

  if (result.code === 0) {
    log(`Auto-apply completed successfully (exit code ${result.code})`);
  } else {
    log(`Auto-apply finished with exit code ${result.code}`);
    if (result.stderr) {
      log(`Stderr: ${result.stderr.slice(0, 500)}`);
    }
  }

  log('=== Auto-Apply Cron End ===\n');
  process.exit(result.code || 0);
}

main().catch((e) => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});

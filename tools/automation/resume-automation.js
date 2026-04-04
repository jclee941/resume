#!/usr/bin/env node
/**
 * Resume Automation - Independent Auto-Apply & Sync System
 *
 * Runs independently without manual intervention:
 * - Automatic session refresh when expired
 * - Profile sync to job platforms
 * - Auto-apply to matching jobs
 * - Comprehensive logging
 *
 * Setup:
 *   1. Set environment variables (see below)
 *   2. Run: node tools/automation/resume-automation.js
 *   3. Or add to crontab for scheduled runs
 *
 * Environment Variables:
 *   RESUME_JOBKOREA_USER=qws941
 *   RESUME_JOBKOREA_PASS=bingogo1l7
 *   RESUME_WANTED_EMAIL=qws941@kakao.com
 *   RESUME_WANTED_PASS=bingogo1l7
 *   RESUME_MAX_APPLY=5
 *   RESUME_DRY_RUN=true
 *
 * Crontab (daily at 9 AM):
 *   0 9 * * * cd /home/jclee/dev/resume && /usr/bin/node tools/automation/resume-automation.js >> /var/log/resume-automation.log 2>&1
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(__dirname));
const JOB_SERVER_DIR = join(PROJECT_ROOT, 'apps/job-server');

const LOG_DIR = join(homedir(), '.opencode', 'data', 'automation-logs');
const ENV_FILE = join(PROJECT_ROOT, '.env.automation');

const CONFIG = {
  jobkorea: {
    user: process.env.RESUME_JOBKOREA_USER,
    pass: process.env.RESUME_JOBKOREA_PASS,
    enabled: !!(process.env.RESUME_JOBKOREA_USER && process.env.RESUME_JOBKOREA_PASS),
  },
  wanted: {
    email: process.env.RESUME_WANTED_EMAIL,
    pass: process.env.RESUME_WANTED_PASS,
    enabled: !!(process.env.RESUME_WANTED_EMAIL && process.env.RESUME_WANTED_PASS),
  },
  maxApply: parseInt(process.env.RESUME_MAX_APPLY || '5', 10),
  dryRun: process.env.RESUME_DRY_RUN !== 'false',
};

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

const today = new Date().toISOString().slice(0, 10);
const logFile = join(LOG_DIR, `automation-${today}.log`);

function log(msg, level = 'info') {
  const ts = new Date().toISOString();
  const icons = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' };
  const line = `[${ts}] ${icons[level] || '📝'} ${msg}`;
  console.log(line);
  appendFileSync(logFile, `${line}\n`);
}

async function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: JOB_SERVER_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...options.env },
      timeout: options.timeout || 300000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (options.verbose) {
        process.stdout.write(data);
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      if (options.verbose) {
        process.stderr.write(data);
      }
    });

    child.on('close', (code) => {
      if (code === 0 || options.ignoreErrors) {
        resolve({ code, stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });

    child.on('error', reject);
  });
}

async function checkSession(platform) {
  log(`Checking ${platform} session...`);
  try {
    const { stdout } = await runCommand('node', [
      '-e',
      `import { SessionManager } from './src/shared/services/session/index.js'; console.log(JSON.stringify(SessionManager.checkHealth('${platform}')))`,
    ]);
    const health = JSON.parse(stdout.trim());
    if (health.valid) {
      log(`${platform} session valid until ${health.expiresAt}`, 'success');
      return true;
    } else {
      log(`${platform} session invalid or expired`, 'warn');
      return false;
    }
  } catch (e) {
    log(`Failed to check ${platform} session: ${e.message}`, 'error');
    return false;
  }
}

async function refreshSession(platform, credentials) {
  log(`Refreshing ${platform} session...`);

  const authScript = join(JOB_SERVER_DIR, 'scripts/auth-headless.js');
  if (!existsSync(authScript)) {
    log(`Auth script not found: ${authScript}`, 'error');
    return false;
  }

  const args = [authScript, platform];
  if (platform === 'jobkorea') {
    args.push(credentials.user, credentials.pass);
  } else {
    args.push(credentials.email, credentials.pass);
  }

  try {
    await runCommand('node', args, { verbose: true, timeout: 120000 });
    log(`${platform} session refreshed`, 'success');
    return true;
  } catch (e) {
    log(`Failed to refresh ${platform} session: ${e.message}`, 'error');
    return false;
  }
}

async function syncProfile(platform) {
  log(`Syncing ${platform} profile...`);

  const syncScript = join(JOB_SERVER_DIR, 'scripts/profile-sync.js');
  const args = [syncScript, platform, CONFIG.dryRun ? '--diff' : '--apply'];

  try {
    const { stdout } = await runCommand('node', args, { verbose: true, timeout: 300000 });

    if (stdout.includes('FAIL')) {
      log(`${platform} sync failed`, 'error');
      return false;
    }

    log(`${platform} sync completed`, 'success');
    return true;
  } catch (e) {
    log(`${platform} sync error: ${e.message}`, 'error');
    return false;
  }
}

async function autoApply() {
  log('Starting auto-apply...');

  const applyScript = join(JOB_SERVER_DIR, 'scripts/auto-apply-cron.js');
  const args = [applyScript];

  if (!CONFIG.dryRun) {
    args.push('--apply');
  }
  args.push(`--max=${CONFIG.maxApply}`);

  try {
    const { stdout } = await runCommand('node', args, { verbose: true, timeout: 600000 });
    log('Auto-apply completed', 'success');
    return true;
  } catch (e) {
    log(`Auto-apply error: ${e.message}`, 'error');
    return false;
  }
}

async function runPlatformAutomation(platform, credentials) {
  log(`\n${'='.repeat(60)}`);
  log(`Processing ${platform.toUpperCase()}`);
  log('='.repeat(60));

  if (!credentials.enabled) {
    log(`${platform} credentials not configured, skipping`, 'warn');
    return { platform, status: 'skipped' };
  }

  const results = { platform, status: 'unknown', steps: {} };

  // Step 1: Check session
  const sessionValid = await checkSession(platform);
  results.steps.sessionCheck = sessionValid;

  // Step 2: Refresh if needed
  if (!sessionValid) {
    const refreshed = await refreshSession(platform, credentials);
    results.steps.sessionRefresh = refreshed;
    if (!refreshed) {
      results.status = 'failed';
      return results;
    }
  } else {
    results.steps.sessionRefresh = 'not-needed';
  }

  // Step 3: Sync profile
  const synced = await syncProfile(platform);
  results.steps.profileSync = synced;

  results.status = synced ? 'success' : 'partial';
  return results;
}

async function main() {
  log('\n' + '='.repeat(60));
  log('RESUME AUTOMATION STARTED');
  log('='.repeat(60));
  log(`Mode: ${CONFIG.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  log(`Max Apply: ${CONFIG.maxApply}`);
  log(`Log File: ${logFile}`);
  log('='.repeat(60) + '\n');

  const results = [];

  // JobKorea
  const jobkoreaResult = await runPlatformAutomation('jobkorea', CONFIG.jobkorea);
  results.push(jobkoreaResult);

  // Wanted
  const wantedResult = await runPlatformAutomation('wanted', CONFIG.wanted);
  results.push(wantedResult);

  // Auto-apply (if any sessions are valid)
  const anySessionValid = results.some((r) => r.status === 'success' || r.status === 'partial');
  if (anySessionValid) {
    const applyResult = await autoApply();
    results.push({ platform: 'auto-apply', status: applyResult ? 'success' : 'failed' });
  } else {
    log('No valid sessions, skipping auto-apply', 'warn');
  }

  // Summary
  log('\n' + '='.repeat(60));
  log('AUTOMATION SUMMARY');
  log('='.repeat(60));

  for (const r of results) {
    const icon =
      r.status === 'success'
        ? '✅'
        : r.status === 'partial'
          ? '⚠️'
          : r.status === 'skipped'
            ? '⏭️'
            : '❌';
    log(`${icon} ${r.platform}: ${r.status}`);
  }

  const allSuccess = results.every((r) => r.status === 'success' || r.status === 'skipped');
  log('='.repeat(60));

  if (allSuccess) {
    log('All operations completed successfully!', 'success');
    process.exit(0);
  } else {
    log('Some operations failed. Check logs above.', 'warn');
    process.exit(1);
  }
}

main().catch((e) => {
  log(`Fatal error: ${e.message}`, 'error');
  process.exit(1);
});

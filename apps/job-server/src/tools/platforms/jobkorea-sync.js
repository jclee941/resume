import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_OUTPUT_TAIL_BYTES = 100 * 1024;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const FORCE_KILL_GRACE_MS = 10 * 1000;
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIR, '../../../../..');
const PROFILE_SYNC_SCRIPT = 'apps/job-server/scripts/profile-sync.js';

function appendTail(current, chunk, maxBytes = MAX_OUTPUT_TAIL_BYTES) {
  const next = `${current}${chunk}`;
  if (next.length <= maxBytes) {
    return next;
  }

  return next.slice(-maxBytes);
}

export function mapToJobKoreaFormat(source) {
  return {
    name: source.personal.name,
    email: source.personal.email,
    phone: source.personal.phone,
    careers: source.careers.map((c) => ({
      company: c.company,
      position: c.role,
      period: c.period,
      description: c.description,
    })),
    education: {
      school: source.education.school,
      major: source.education.major,
      status: source.education.status,
    },
    certifications: source.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: c.date,
    })),
  };
}

export function runJobKoreaProfileSync(options = {}) {
  const {
    spawnImpl = spawn,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cwd = REPO_ROOT,
    now = () => Date.now(),
  } = options;

  return new Promise((resolvePromise) => {
    const startedAt = now();
    let stdoutTail = '';
    let stderrTail = '';
    let settled = false;
    let timedOut = false;
    let forceKillTimer = null;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutTimer);
      if (forceKillTimer) {
        clearTimeout(forceKillTimer);
      }
      resolvePromise({
        ...result,
        duration_ms: now() - startedAt,
        stdout_tail: stdoutTail,
        stderr_tail: stderrTail,
      });
    };

    const child = spawnImpl(process.execPath, [PROFILE_SYNC_SCRIPT, 'jobkorea', '--apply'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (chunk) => {
      stdoutTail = appendTail(stdoutTail, String(chunk));
    });

    child.stderr?.on('data', (chunk) => {
      stderrTail = appendTail(stderrTail, String(chunk));
    });

    child.on('error', (error) => {
      finish({
        success: false,
        error: error.message,
        exit_code: null,
      });
    });

    child.on('close', (exitCode) => {
      if (timedOut) {
        finish({
          success: false,
          error: 'timeout',
          exit_code: null,
        });
        return;
      }

      finish({
        success: exitCode === 0,
        exit_code: exitCode,
      });
    });

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      forceKillTimer = setTimeout(() => {
        child.kill('SIGKILL');
      }, FORCE_KILL_GRACE_MS);
    }, timeoutMs);
  });
}

export async function syncToJobKorea(data, params) {
  if (params.dry_run) {
    return {
      dry_run: true,
      method: 'browser_automation',
      would_sync: data,
      steps: [
        '1. Navigate to jobkorea.co.kr/User/Resume',
        '2. Fill personal info form',
        '3. Add/update career entries',
        '4. Add certifications',
        '5. Save resume',
      ],
    };
  }

  return runJobKoreaProfileSync();
}

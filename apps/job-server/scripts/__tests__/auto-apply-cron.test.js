import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const cronPath = fileURLToPath(new URL('../auto-apply-cron.js', import.meta.url));
const preloadPath = fileURLToPath(new URL('./auto-apply-cron-preload.js', import.meta.url));

const invalidHealth = { valid: false, expiringSoon: false, expiresAt: null };
const validHealth = {
  valid: true,
  expiringSoon: false,
  expiresAt: '2026-08-23T00:00:00.000Z',
};

function executeCron(
  t,
  {
    healthSequence = [validHealth],
    maxArgs = ['--max=3'],
    refreshSucceeds = false,
    requestedApply = true,
  } = {}
) {
  // Given: an isolated cron process with deterministic session and child-process adapters.
  const home = mkdtempSync(join(tmpdir(), 'auto-apply-cron-test-'));
  const capturePath = join(home, 'spawn.json');
  const sessionCheckPath = join(home, 'session-check');
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    ...process.env,
    HOME: home,
    CRON_TEST_CAPTURE_PATH: capturePath,
    CRON_TEST_SESSION_CHECK_PATH: sessionCheckPath,
    CRON_TEST_HEALTH_SEQUENCE: JSON.stringify(healthSequence),
    CRON_TEST_REFRESH_SUCCEEDS: String(refreshSucceeds),
  };
  delete env.WANTED_EMAIL;
  delete env.WANTED_PASSWORD;
  delete env.WANTED_ONEID_CLIENT_ID;

  // When: the real cron entry point resolves session health and starts the child CLI.
  const cronArgs = ['--import', preloadPath, cronPath, ...maxArgs];
  if (requestedApply) cronArgs.push('--apply');
  const result = spawnSync(process.execPath, cronArgs, {
    env,
    encoding: 'utf8',
    timeout: 5000,
  });

  return {
    result,
    childArgs: existsSync(capturePath)
      ? JSON.parse(readFileSync(capturePath, 'utf8')).args
      : null,
    sessionChecked: existsSync(sessionCheckPath),
  };
}

function runCron(t, options) {
  // Then: a valid cron invocation checks the session and exposes the child arguments.
  const run = executeCron(t, options);
  assert.equal(run.result.status, 0, run.result.stderr || run.result.stdout);
  assert.equal(run.sessionChecked, true);
  assert.notEqual(run.childArgs, null);
  return run.childArgs;
}

test('omits --apply when an invalid session cannot be refreshed', (t) => {
  const childArgs = runCron(t, { healthSequence: [invalidHealth] });

  assert.deepEqual(childArgs.slice(1), ['apply', '--max=3']);
});

test('preserves requested --apply when the session is valid', (t) => {
  const childArgs = runCron(t, { healthSequence: [validHealth] });

  assert.deepEqual(childArgs.slice(1), ['apply', '--max=3', '--apply']);
});

test('preserves requested --apply when an invalid session refreshes successfully', (t) => {
  const childArgs = runCron(t, {
    healthSequence: [invalidHealth, validHealth],
    refreshSucceeds: true,
  });

  assert.deepEqual(childArgs.slice(1), ['apply', '--max=3', '--apply']);
});

test('keeps dry-run as the default with a valid session', (t) => {
  const childArgs = runCron(t, {
    healthSequence: [validHealth],
    requestedApply: false,
  });

  assert.deepEqual(childArgs.slice(1), ['apply', '--max=3']);
});

const invalidMaxCases = [
  ['partial decimal', ['--max=1.5']],
  ['partial exponent', ['--max=1e2']],
  ['partial numeric suffix', ['--max=5junk']],
  ['empty value', ['--max=']],
  ['non-numeric value', ['--max=nope']],
  ['negative value', ['--max=-1']],
  ['unsafe integer', ['--max=9007199254740992']],
  ['duplicate flags', ['--max=1', '--max=2']],
];

for (const [description, maxArgs] of invalidMaxCases) {
  test(`rejects ${description} before session check or child spawn`, (t) => {
    const run = executeCron(t, { maxArgs });

    assert.notEqual(run.result.status, 0);
    assert.equal(run.sessionChecked, false);
    assert.equal(run.childArgs, null);
  });
}

test('forwards zero as a valid maximum', (t) => {
  const childArgs = runCron(t, { maxArgs: ['--max=0'] });

  assert.deepEqual(childArgs.slice(1), ['apply', '--max=0', '--apply']);
});

test('uses five as the default maximum when --max is absent', (t) => {
  const childArgs = runCron(t, { maxArgs: [] });

  assert.deepEqual(childArgs.slice(1), ['apply', '--max=5', '--apply']);
});

import assert from 'node:assert/strict';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, it, mock } from 'node:test';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
// Mirror the REPO_ROOT computation in ../jobkorea-sync.js so the test's
// expected cwd matches the production code's spawn cwd regardless of where
// the test runner is invoked from.
const REPO_ROOT = resolve(TEST_DIR, '../../../../../..');


const require = createRequire(import.meta.url);
const childProcessCjs = require('child_process');

let importCounter = 0;

function createFakeChild() {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = mock.fn(() => true);
  return child;
}

async function loadModule() {
  importCounter += 1;
  return import(`../jobkorea-sync.js?test=${importCounter}`);
}

describe('jobkorea sync platform', () => {
  beforeEach(() => {
    mock.restoreAll();
    syncBuiltinESMExports();
  });

  it('keeps the existing dry-run response shape', async () => {
    const { syncToJobKorea } = await loadModule();
    const data = { name: 'Test User', careers: [] };

    const result = await syncToJobKorea(data, { dry_run: true });

    assert.deepStrictEqual(result, {
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
    });
  });

  it('returns success when the delegated CLI exits with code 0', async () => {
    const child = createFakeChild();
    const spawnMock = mock.method(childProcessCjs, 'spawn', () => {
      queueMicrotask(() => {
        child.stdout.write('sync ok\n');
        child.stderr.write('warning\n');
        child.emit('close', 0);
      });
      return child;
    });
    syncBuiltinESMExports();
    const { syncToJobKorea } = await loadModule();

    const result = await syncToJobKorea({}, { dry_run: false });

    assert.equal(result.success, true);
    assert.equal(result.exit_code, 0);
    assert.match(result.stdout_tail, /sync ok/);
    assert.match(result.stderr_tail, /warning/);
    assert.equal(typeof result.duration_ms, 'number');
    assert.deepStrictEqual(spawnMock.mock.calls[0].arguments, [
      process.execPath,
      ['apps/job-server/scripts/profile-sync.js', 'jobkorea', '--apply'],
      {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ]);
  });

  it('returns failure when the delegated CLI exits with code 1', async () => {
    const child = createFakeChild();
    mock.method(childProcessCjs, 'spawn', () => {
      queueMicrotask(() => {
        child.stderr.write('sync failed\n');
        child.emit('close', 1);
      });
      return child;
    });
    syncBuiltinESMExports();
    const { syncToJobKorea } = await loadModule();

    const result = await syncToJobKorea({}, { dry_run: false });

    assert.equal(result.success, false);
    assert.equal(result.exit_code, 1);
    assert.match(result.stderr_tail, /sync failed/);
  });

  it('returns a timeout error when the delegated CLI does not exit in time', async () => {
    const child = createFakeChild();
    mock.method(childProcessCjs, 'spawn', () => {
      child.kill.mock.mockImplementation((signal) => {
        if (signal === 'SIGTERM') {
          setTimeout(() => child.emit('close', null), 0);
        }
        return true;
      });
      return child;
    });
    syncBuiltinESMExports();
    const { runJobKoreaProfileSync } = await loadModule();

    const result = await runJobKoreaProfileSync({ timeoutMs: 5 });

    assert.equal(result.success, false);
    assert.equal(result.error, 'timeout');
    assert.equal(result.exit_code, null);
    assert.equal(child.kill.mock.calls[0].arguments[0], 'SIGTERM');
    assert.equal(typeof result.duration_ms, 'number');
  });
});

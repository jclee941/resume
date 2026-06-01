import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(__dirname, '../send-jobs-telegram.js');
const fixturePath = resolve(__dirname, '../__fixtures__/telegram-queue.json');

function runScript(args) {
  return new Promise((resolveRun) => {
    execFile(
      process.execPath,
      [scriptPath, ...args],
      {
        cwd: resolve(__dirname, '../../../..'),
        // strip Telegram creds so the script stays in dry-run / no-network path
        env: { ...process.env, TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '' },
        timeout: 30000,
      },
      (error, stdout, stderr) => resolveRun({ error, stdout, stderr })
    );
  });
}

describe('send-jobs-telegram.js --separate --dry-run', () => {
  it('S7: prints one "would send" block per job (no network)', async () => {
    const { error, stdout } = await runScript([
      '--separate',
      '--dry-run',
      `--queue=${fixturePath}`,
    ]);
    assert.equal(error, null, `script should exit 0 in dry-run, stderr: ${error?.message}`);
    // 3 fixture jobs -> 3 "would send" markers
    const markers = stdout.match(/would send/gi) || [];
    assert.equal(markers.length, 3, `expected 3 would-send markers, got ${markers.length}\n${stdout}`);
    // per-job content present
    assert.match(stdout, /DevSecOps Engineer/);
    assert.match(stdout, /Site Reliability Engineer/);
    assert.match(stdout, /보안 인프라 엔지니어/);
  });

  it('S7b: default (consolidated) dry-run still works and does NOT emit per-job markers', async () => {
    const { error, stdout } = await runScript(['--dry-run', `--queue=${fixturePath}`]);
    assert.equal(error, null);
    assert.match(stdout, /DRY RUN/i);
    // consolidated mode shows a single preview, not 3 "would send" blocks
    const markers = stdout.match(/would send/gi) || [];
    assert.notEqual(markers.length, 3);
  });
});

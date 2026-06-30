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
    assert.equal(
      markers.length,
      3,
      `expected 3 would-send markers, got ${markers.length}\n${stdout}`
    );
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

  it('S9: drops postings below the worthiness threshold (지원할만한 only)', async () => {
    const mixed = resolve(__dirname, '../__fixtures__/telegram-queue-mixed.json');
    const { error, stdout } = await runScript(['--separate', '--dry-run', `--queue=${mixed}`]);
    assert.equal(error, null, `script should exit 0, stderr: ${error?.message}`);
    // 2 of 3 jobs are worthy (85, 64); the 35-score job is excluded.
    const markers = stdout.match(/would send/gi) || [];
    assert.equal(
      markers.length,
      2,
      `expected 2 worthy would-send markers, got ${markers.length}\n${stdout}`
    );
    assert.match(stdout, /Senior SRE/);
    assert.match(stdout, /Cloud Engineer/);
    assert.ok(!/Unrelated Sales Role/.test(stdout), 'sub-threshold job must NOT be sent');
  });

  it('S9b: --min-score override tightens the worthiness gate', async () => {
    const mixed = resolve(__dirname, '../__fixtures__/telegram-queue-mixed.json');
    const { error, stdout } = await runScript([
      '--separate',
      '--dry-run',
      '--min-score=80',
      `--queue=${mixed}`,
    ]);
    assert.equal(error, null);
    const markers = stdout.match(/would send/gi) || [];
    assert.equal(
      markers.length,
      1,
      `only the 85-score job qualifies at min-score=80, got ${markers.length}`
    );
    assert.match(stdout, /Senior SRE/);
    assert.ok(!/Cloud Engineer/.test(stdout), '64 < 80 excluded');
  });

  it('S10: queue-source jobs WITHOUT scores are treated as curated-worthy (not dropped)', async () => {
    const unscored = resolve(__dirname, '../__fixtures__/telegram-queue-unscored.json');
    const { error, stdout } = await runScript(['--separate', '--dry-run', `--queue=${unscored}`]);
    assert.equal(error, null, `script should exit 0, stderr: ${error?.message}`);
    // both hand-curated jobs (no scores) must still be sent
    const markers = stdout.match(/would send/gi) || [];
    assert.equal(
      markers.length,
      2,
      `curated unscored queue must send all, got ${markers.length}\n${stdout}`
    );
    assert.match(stdout, /Staff SRE/);
    assert.match(stdout, /Security Engineer/);
  });

  it('S11: --ats-only sends only worthy ATS postings and excludes Wanted/JobKorea/JK', async () => {
    const atsMixed = resolve(__dirname, '../__fixtures__/telegram-queue-ats-mixed.json');
    const { error, stdout } = await runScript([
      '--ats-only',
      '--separate',
      '--dry-run',
      `--queue=${atsMixed}`,
    ]);

    assert.equal(error, null, `script should exit 0, stderr: ${error?.message}`);
    const markers = stdout.match(/would send/gi) || [];
    assert.equal(
      markers.length,
      3,
      `expected 3 ATS worthy would-send markers, got ${markers.length}\n${stdout}`
    );
    assert.match(stdout, /Senior Cloud Security Engineer/);
    assert.match(stdout, /Staff SRE/);
    assert.match(stdout, /Infrastructure Security Engineer/);
    assert.ok(!/Wanted Security Engineer/.test(stdout), 'Wanted postings must be excluded');
    assert.ok(!/JobKorea SRE/.test(stdout), 'JobKorea postings must be excluded');
    assert.ok(!/JK Cloud Engineer/.test(stdout), 'JK alias postings must be excluded');
    assert.ok(!/Entry Sales Engineer/.test(stdout), 'low-score ATS postings must be excluded');
  });
});

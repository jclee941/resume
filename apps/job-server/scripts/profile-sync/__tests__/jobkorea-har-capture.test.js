import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { assertSafeHarOutputPath, getDefaultHarOutputPath } from '../jobkorea-handler/har-capture.js';
import { parseHarCaptureCliArgs } from '../jobkorea-handler/har-capture-cli.js';
import { redactSensitiveValue } from '../jobkorea-handler/har-redaction-patterns.js';

describe('JobKorea HAR output path safety', () => {
  it('allows the default /tmp/opencode output path', () => {
    const safePath = assertSafeHarOutputPath(getDefaultHarOutputPath(new Date('2026-05-08T00:00:00Z')));

    assert.ok(safePath.startsWith('/tmp/opencode/jobkorea-har/'));
    assert.ok(safePath.endsWith('.har'));
  });

  it('rejects repository-local HAR paths', () => {
    const repoLocalPath = path.resolve('scripts/profile-sync/jobkorea.har');

    assert.throws(() => assertSafeHarOutputPath(repoLocalPath), /inside repository/);
  });

  it('rejects paths outside /tmp', () => {
    assert.throws(() => assertSafeHarOutputPath('/var/tmp/jobkorea.har'), /outside \/tmp/);
  });
});

describe('JobKorea HAR CLI argument parsing', () => {
  it('parses dry-run output capture flags', () => {
    assert.deepStrictEqual(
      parseHarCaptureCliArgs(['--dry-run', '--output', '/tmp/opencode/jobkorea-har/test.har']),
      {
        output: '/tmp/opencode/jobkorea-har/test.har',
        apply: false,
        dryRun: true,
        includeSave: false,
        includePortfolio: false,
      }
    );
  });

  it('parses apply capture with save and portfolio endpoints', () => {
    assert.deepStrictEqual(parseHarCaptureCliArgs(['--apply', '--include-save', '--include-portfolio']), {
      output: undefined,
      apply: true,
      dryRun: false,
      includeSave: true,
      includePortfolio: true,
    });
  });

  it('rejects unsafe or ambiguous flag combinations', () => {
    assert.throws(() => parseHarCaptureCliArgs(['--apply', '--dry-run']), /mutually exclusive/);
    assert.throws(() => parseHarCaptureCliArgs(['--include-save']), /requires --apply/);
    assert.throws(() => parseHarCaptureCliArgs(['--output']), /requires a path/);
    assert.throws(() => parseHarCaptureCliArgs(['--unknown']), /Unknown flag/);
  });
});

describe('JobKorea HAR redaction patterns', () => {
  it('redacts sensitive headers and field names', () => {
    assert.strictEqual(redactSensitiveValue('cookie', 'a=b'), '[REDACTED]');
    assert.strictEqual(redactSensitiveValue('UserResume.Email', 'user@example.test'), '[REDACTED]');
    assert.strictEqual(redactSensitiveValue('Career[c1].C_Name', 'Company'), 'Company');
  });
});

import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { validateReleaseWorkflows } from '../validate-release-workflows.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
let fixtureRoot;

beforeEach(() => {
  fixtureRoot = mkdtempSync(path.join(tmpdir(), 'release-method-'));
  cpSync(path.join(repositoryRoot, '.github'), path.join(fixtureRoot, '.github'), {
    recursive: true,
  });
});

afterEach(() => rmSync(fixtureRoot, { recursive: true, force: true }));

function inject(command) {
  const file = path.join(fixtureRoot, '.github/workflows/release.yml');
  const source = readFileSync(file, 'utf8');
  const boundary = 'set -euo pipefail\n          go -C tools/scripts run ./release/publish';
  assert.ok(source.includes(boundary));
  writeFileSync(
    file,
    source.replace(
      boundary,
      `set -euo pipefail\n          ${command}\n          go -C tools/scripts run ./release/publish`
    )
  );
}

function rejects(command) {
  inject(command);
  assert.throws(() => validateReleaseWorkflows(fixtureRoot), /direct tag or release writer/u);
}

describe('GitHub API effective method inference', () => {
  it('rejects implicit POST tag creation from short field flags', () => {
    rejects('gh api repos/example/repo/git/refs -f ref=refs/tags/v9.9.9 -f sha=$TARGET_SHA');
  });

  it('rejects implicit POST release creation from typed field flags', () => {
    rejects('gh api repos/example/repo/releases -f tag_name=v9.9.9 -F draft=true');
  });

  for (const [name, command] of [
    [
      'long field pair',
      'gh api repos/example/repo/git/refs --field ref=refs/tags/v9.9.9 --field sha=$TARGET_SHA',
    ],
    [
      'long field equals',
      'gh api repos/example/repo/git/refs --field=ref=refs/tags/v9.9.9 --field=sha=$TARGET_SHA',
    ],
    [
      'raw field pair',
      'gh api repos/example/repo/git/refs --raw-field ref=refs/tags/v9.9.9 --raw-field sha=$TARGET_SHA',
    ],
    [
      'raw field equals',
      'gh api repos/example/repo/git/refs --raw-field=ref=refs/tags/v9.9.9 --raw-field=sha=$TARGET_SHA',
    ],
    [
      'compact short raw field',
      'gh api repos/example/repo/git/refs -fref=refs/tags/v9.9.9 -fsha=$TARGET_SHA',
    ],
    ['compact short typed field', 'gh api repos/example/repo/releases -Ftag_name=v9.9.9'],
  ]) {
    it(`rejects implicit POST using ${name}`, () => rejects(command));
  }

  for (const [name, command] of [
    [
      'explicit long GET',
      'gh api --method GET repos/example/repo/git/refs -f ref=refs/tags/v9.9.9',
    ],
    ['explicit compact GET', 'gh api -XGET repos/example/repo/releases -Ftag_name=v9.9.9'],
  ]) {
    it(`preserves ${name} despite field flags`, () => {
      inject(command);
      assert.doesNotThrow(() => validateReleaseWorkflows(fixtureRoot));
    });
  }
});

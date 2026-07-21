import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { validateReleaseWorkflows } from '../validate-release-workflows.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
let fixtureRoot;

beforeEach(() => {
  fixtureRoot = mkdtempSync(path.join(tmpdir(), 'release-workflows-'));
  cpSync(path.join(repositoryRoot, '.github'), path.join(fixtureRoot, '.github'), {
    recursive: true,
  });
});

afterEach(() => rmSync(fixtureRoot, { recursive: true, force: true }));

function mutate(from, to) {
  const file = path.join(fixtureRoot, '.github/workflows/release.yml');
  const source = readFileSync(file, 'utf8');
  assert.ok(source.includes(from), `fixture token missing: ${from}`);
  writeFileSync(file, source.replaceAll(from, to));
}

function rejects(message) {
  assert.throws(() => validateReleaseWorkflows(fixtureRoot), message);
}

function injectDirectCommand(command) {
  mutate(
    'set -euo pipefail\n          go -C tools/scripts run ./release/publish',
    `set -euo pipefail\n          ${command}\n          go -C tools/scripts run ./release/publish`
  );
}

describe('release workflow policy', () => {
  it('accepts the one immutable serialized publisher', () => {
    assert.equal(validateReleaseWorkflows(repositoryRoot).publisher, 'release.yml');
  });

  it('rejects duplicate publisher', () => {
    cpSync(
      path.join(fixtureRoot, '.github/workflows/release.yml'),
      path.join(fixtureRoot, '.github/workflows/duplicate-release.yml')
    );
    rejects(/exactly one release publisher/u);
  });

  it('rejects a comment-only publish boundary', () => {
    mutate(
      'go -C tools/scripts run ./release/publish',
      '# go -C tools/scripts run ./release/publish'
    );
    rejects(/tested publish boundary/u);
  });

  for (const [name, from, to, error] of [
    [
      'missing serialized concurrency',
      'cancel-in-progress: false',
      'cancel-in-progress: true',
      /serialized/u,
    ],
    [
      'untrusted workflow run',
      'head_repository.full_name == github.repository',
      'true',
      /trusted workflow_run/u,
    ],
    ['moving checkout', 'ref: ${{ env.TARGET_SHA }}', 'ref: master', /immutable target/u],
    [
      'wrong next-version module root',
      'go -C tools/scripts run ./release/next-version',
      'go run ./tools/scripts/release/next-version',
      /next-version boundary/u,
    ],
    [
      'publish before verified asset',
      'needs: [prepare, verify]',
      'needs: [prepare]',
      /verification dependency/u,
    ],
    ['wrong target SHA', '--target "$TARGET_SHA"', '--target master', /target SHA/u],
    [
      'wrong transaction asset',
      '--asset "../../dist/resume-source-${TAG}.tar.gz"',
      '--asset ../../dist/wrong.tar.gz',
      /verified asset/u,
    ],
    [
      'missing run ownership',
      '--run-marker "release-run:${GITHUB_RUN_ID}"',
      '--run-marker unknown',
      /run ownership/u,
    ],
    ['missing deterministic gzip', 'gzip -n -9', 'gzip -9', /gzip/u],
    ['missing digest contract', 'release-manifest.json', 'release-metadata.json', /manifest/u],
    [
      'notes outside immutable range',
      'git log --format=\'- %s (%h)\' "$RANGE"',
      "git log --format='- %s (%h)' master",
      /immutable decision range/u,
    ],
    ['missing no-release artifact', 'release-decision.json', 'decision.json', /decision/u],
  ]) {
    it(`rejects ${name}`, () => {
      mutate(from, to);
      rejects(error);
    });
  }

  it('rejects a split-argument direct tag writer beside the tested boundary', () => {
    injectDirectCommand(
      'gh api --method POST repos/example/repo/git/refs -f ref=refs/tags/v9.9.9 -f sha=$TARGET_SHA'
    );
    rejects(/direct tag or release writer/u);
  });

  it('rejects a separate contents-write tag publisher', () => {
    writeFileSync(
      path.join(fixtureRoot, '.github/workflows/tag-writer.yml'),
      `name: Tag writer
on: workflow_dispatch
permissions:
  contents: write
jobs:
  tag:
    runs-on: ubuntu-latest
    steps:
      - run: gh api --method POST repos/example/repo/git/refs -f ref=refs/tags/v9.9.9 -f sha=$TARGET_SHA
`
    );
    rejects(/exactly one release publisher|direct tag or release writer/u);
  });

  it('rejects an action release writer beside the tested boundary', () => {
    mutate(
      '      - name: Run tested release transaction',
      '      - uses: softprops/action-gh-release@v3\n      - name: Run tested release transaction'
    );
    rejects(/direct tag or release writer/u);
  });

  for (const [name, command] of [
    ['git push tags', 'git push origin --tags'],
    [
      'variable-path tag API POST',
      'gh api -X POST "repos/$GITHUB_REPOSITORY/git/refs" -f "ref=refs/tags/$TAG" -f sha=$TARGET_SHA',
    ],
    ['release API POST', 'gh api --method POST repos/example/repo/releases -f tag_name=v9.9.9'],
    ['release API PATCH', 'gh api --method PATCH repos/example/repo/releases/7 -F draft=false'],
    ['release API DELETE', 'gh api --method DELETE repos/example/repo/releases/7'],
    [
      'tag API PATCH',
      'env GH_TOKEN=fake gh api -XPATCH repos/example/repo/git/refs/tags/v9.9.9 -f sha=$TARGET_SHA',
    ],
    ['tag API DELETE', 'gh api --method DELETE repos/example/repo/git/refs/tags/v9.9.9'],
    ['gh release create', 'gh release create v9.9.9'],
    ['gh release edit', 'gh release edit v9.9.9 --draft=false'],
    ['gh release delete', 'gh release delete v9.9.9 --yes'],
    ['gh release upload', 'gh release upload v9.9.9 payload.tar.gz'],
  ]) {
    it(`rejects direct ${name}`, () => {
      injectDirectCommand(command);
      rejects(/direct tag or release writer/u);
    });
  }

  it('rejects malformed YAML', () => {
    mutate('jobs:', 'jobs: [');
    rejects(/YAML/u);
  });
});

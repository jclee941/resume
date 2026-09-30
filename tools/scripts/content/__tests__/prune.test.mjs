import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pull } from '../pull.mjs';
import { CREDS, fakeD1, makeRoot, put } from './d1-test-kit.mjs';

const FIXTURE_DIR = 'tests/fixtures/content-pack';
const SHARED = 'applications/x/shared.md';
const ONLY = 'applications/x/fixture-only.md';
const has = (root, repoPath) => existsSync(path.join(root, repoPath));

/** Fixtures hold SHARED (+ ONLY when given); D1 holds SHARED only. */
function setup(fixtureOnly = [ONLY]) {
  const root = makeRoot();
  put(root, `${FIXTURE_DIR}/${SHARED}`, 'fake');
  for (const file of fixtureOnly) put(root, `${FIXTURE_DIR}/${file}`, 'fake only');
  const d1 = fakeD1();
  d1.seed(SHARED, Buffer.from('real'));
  const run = (source, lines = [], warns = []) =>
    pull({
      root,
      env: source === 'd1' ? CREDS : {},
      source,
      fetchImpl: d1.fetchImpl,
      out: (l) => lines.push(l),
      warn: (l) => warns.push(l),
    });
  return { root, d1, run };
}

test('a d1 pull removes an unchanged file only the previous fixtures pull wrote', async () => {
  const { root, run } = setup();
  await run('fixtures');
  assert.ok(has(root, ONLY));
  const lines = [];
  await run('d1', lines);
  assert.ok(!has(root, ONLY));
  assert.equal(readFileSync(path.join(root, SHARED), 'utf8'), 'real');
  assert.ok(lines.some((l) => l.includes('removed 1') && l.includes('kept 0')));
  const manifest = JSON.parse(readFileSync(path.join(root, '.content/manifest.json'), 'utf8'));
  assert.deepEqual(
    manifest.files.map((f) => f.path),
    [SHARED]
  );
});

test('a fixture-only file edited since the pull is kept with a warning naming the path', async () => {
  const { root, run } = setup();
  await run('fixtures');
  put(root, ONLY, 'my unpushed edit');
  const lines = [];
  const warns = [];
  await run('d1', lines, warns);
  assert.equal(readFileSync(path.join(root, ONLY), 'utf8'), 'my unpushed edit');
  assert.ok(warns.some((w) => w.includes(ONLY)));
  assert.ok(!warns.concat(lines).some((l) => l.includes('unpushed edit')));
  assert.ok(lines.some((l) => l.includes('removed 0') && l.includes('kept 1')));
});

test('a file that is not in the previous manifest is kept', async () => {
  const { root, run } = setup();
  await run('fixtures');
  put(root, 'applications/x/new-unpushed.md', 'brand new');
  await run('d1');
  assert.equal(
    readFileSync(path.join(root, 'applications/x/new-unpushed.md'), 'utf8'),
    'brand new'
  );
  assert.ok(!has(root, ONLY));
});

test('without a previous manifest nothing is removed', async () => {
  const { root, run } = setup();
  put(root, ONLY, 'left over from an unknown pull');
  const lines = [];
  await run('d1', lines);
  assert.ok(has(root, ONLY));
  assert.ok(!lines.some((l) => l.includes('removed')));
});

test('a d1 to fixtures switch prunes the d1-only file', async () => {
  const { root, d1, run } = setup([]);
  d1.seed('applications/x/d1-only.md', Buffer.from('real only'));
  await run('d1');
  assert.ok(has(root, 'applications/x/d1-only.md'));
  const lines = [];
  await run('fixtures', lines);
  assert.ok(!has(root, 'applications/x/d1-only.md'));
  assert.equal(readFileSync(path.join(root, SHARED), 'utf8'), 'fake');
  assert.ok(lines.some((l) => l.includes('removed 1')));
});

test('a file already deleted by hand is not an error and not counted as kept', async () => {
  const { root, run } = setup();
  await run('fixtures');
  const { rmSync } = await import('node:fs');
  rmSync(path.join(root, ONLY));
  const warns = [];
  await run('d1', [], warns);
  assert.deepEqual(warns, []);
});

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { run } from '../cli.mjs';
import { sha256Hex } from '../pack.mjs';
import { CREDS, fakeD1, makeRoot, put } from './d1-test-kit.mjs';

const TARGET = 'applications/a/one.md';
const FIXTURE = `tests/fixtures/content-pack/${TARGET}`;
const read = (root, repoPath) => readFileSync(path.join(root, repoPath), 'utf8');
const manifestOf = (root, files, source = 'd1') =>
  put(
    root,
    '.content/manifest.json',
    JSON.stringify({
      version: 1,
      source,
      files: files.map(([repoPath, text]) => ({
        path: repoPath,
        sha256: sha256Hex(Buffer.from(text)),
        size: text.length,
      })),
    })
  );

/** Run `ensure` and collect its exit code, output lines, and warning count. */
async function ensureRun(root, env, args = [], fetchImpl) {
  const lines = [];
  const warnings = [];
  const code = await run(['ensure', ...args], {
    root,
    env,
    fetchImpl,
    out: (line) => lines.push(line),
    warn: (line) => warnings.push(line),
  });
  return { code, lines, warnings };
}

test('fixtures materialize on an empty checkout and record a fixtures manifest', async () => {
  const root = makeRoot();
  put(root, FIXTURE, 'fake');
  const { code } = await ensureRun(root, { CONTENT_SOURCE: 'fixtures' });
  assert.equal(code, 0);
  assert.equal(read(root, TARGET), 'fake');
  assert.equal(JSON.parse(read(root, '.content/manifest.json')).source, 'fixtures');
});

test('fixtures refuse to clobber a local pack file edited since the last pull', async () => {
  const root = makeRoot();
  put(root, FIXTURE, 'fake');
  put(root, TARGET, 'unpushed edit');
  manifestOf(root, [[TARGET, 'pulled']]);
  assert.equal((await ensureRun(root, { CONTENT_SOURCE: 'fixtures' })).code, 1);
  assert.equal(read(root, TARGET), 'unpushed edit');
  assert.equal((await ensureRun(root, { CONTENT_SOURCE: 'fixtures' }, ['--force'])).code, 0);
  assert.equal(read(root, TARGET), 'fake');
});

test('fixtures refuse a local pack file that no manifest vouches for', async () => {
  const root = makeRoot();
  put(root, FIXTURE, 'fake');
  put(root, TARGET, 'tracked real file');
  assert.equal((await ensureRun(root, { CONTENT_SOURCE: 'fixtures' })).code, 1);
  assert.equal(read(root, TARGET), 'tracked real file');
});

test('fixtures replace a local file that still equals the last pull', async () => {
  const root = makeRoot();
  put(root, FIXTURE, 'fake');
  put(root, TARGET, 'pulled');
  manifestOf(root, [[TARGET, 'pulled']]);
  assert.equal((await ensureRun(root, { CONTENT_SOURCE: 'fixtures' })).code, 0);
  assert.equal(read(root, TARGET), 'fake');
});

test('WORKERS_CI=1 without credentials fails closed and never uses fixtures', async () => {
  const root = makeRoot();
  put(root, FIXTURE, 'fake');
  assert.equal((await ensureRun(root, { WORKERS_CI: '1' })).code, 1);
  assert.equal(existsSync(path.join(root, TARGET)), false);
});

test('WORKERS_CI=1 refuses CONTENT_SOURCE=fixtures', async () => {
  const root = makeRoot();
  put(root, FIXTURE, 'fake');
  const env = { ...CREDS, WORKERS_CI: '1', CONTENT_SOURCE: 'fixtures' };
  assert.equal((await ensureRun(root, env)).code, 1);
  assert.equal(existsSync(path.join(root, TARGET)), false);
});

test('WORKERS_CI=1 with credentials pulls the pack from D1', async () => {
  const d1 = fakeD1();
  d1.seed(TARGET, Buffer.from('from d1'));
  const root = makeRoot();
  const { code } = await ensureRun(root, { ...CREDS, WORKERS_CI: '1' }, [], d1.fetchImpl);
  assert.equal(code, 0);
  assert.equal(read(root, TARGET), 'from d1');
});

test('local dev without a materialized pack exits 1 and points to content:pull', async () => {
  const lines = [];
  const original = console.error;
  console.error = (line) => lines.push(String(line));
  try {
    assert.equal((await ensureRun(makeRoot(), {})).code, 1);
  } finally {
    console.error = original;
  }
  assert.ok(lines.some((line) => line.includes('npm run content:pull')));
});

test('local dev accepts a complete pack and fails when a listed file is missing', async () => {
  const root = makeRoot();
  put(root, TARGET, 'pulled');
  manifestOf(root, [[TARGET, 'pulled']]);
  const ready = await ensureRun(root, {});
  assert.equal(ready.code, 0);
  assert.equal(ready.warnings.length, 0);
  manifestOf(root, [
    [TARGET, 'pulled'],
    ['applications/a/two.md', 'gone'],
  ]);
  assert.equal((await ensureRun(root, {})).code, 1);
});

test('local dev warns, but does not fail, when files differ from the last pull', async () => {
  const root = makeRoot();
  put(root, TARGET, 'edited locally');
  manifestOf(root, [[TARGET, 'pulled']]);
  const { code, warnings } = await ensureRun(root, {});
  assert.equal(code, 0);
  assert.equal(warnings.length, 1);
  assert.equal(read(root, TARGET), 'edited locally');
});

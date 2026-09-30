import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { run } from '../cli.mjs';
import { CREDS, fakeD1, makeRoot, put } from './helpers.mjs';

const capture = () => {
  const lines = [];
  return { lines, out: (l) => lines.push(l) };
};

test('manifest prints the pack file count and writes the JSON with --out', async () => {
  const root = makeRoot();
  put(root, 'applications/a/one.md', 'one');
  put(root, 'ta/deck.bin', 'two');
  const { lines, out } = capture();
  const target = path.join(root, 'out/manifest.json');
  assert.equal(await run(['manifest', '--out', target], { root, env: {}, out }), 0);
  assert.equal(lines[0], 'pack files: 2 (6 bytes)');
  assert.equal(JSON.parse(readFileSync(target, 'utf8')).files.length, 2);
});

test('pull without credentials exits non-zero even under WORKERS_CI=1', async () => {
  const { out } = capture();
  assert.equal(await run(['pull'], { root: makeRoot(), env: { WORKERS_CI: '1' }, out }), 1);
});

test('push and pull round-trip through the fake D1', async () => {
  const d1 = fakeD1();
  const source = makeRoot();
  put(source, 'applications/a/one.md', 'one');
  const { out } = capture();
  const env = CREDS;
  assert.equal(await run(['push'], { root: source, env, fetchImpl: d1.fetchImpl, out }), 0);
  const target = makeRoot();
  assert.equal(await run(['pull'], { root: target, env, fetchImpl: d1.fetchImpl, out }), 0);
  assert.equal(readFileSync(path.join(target, 'applications/a/one.md'), 'utf8'), 'one');
});

test('guard exits 1 on a violation and 0 when clean; unknown commands exit 2', async () => {
  const root = makeRoot();
  execFileSync('git', ['init', '-q'], { cwd: root });
  const { out } = capture();
  assert.equal(await run(['guard', '--staged'], { root, out }), 0);
  put(root, 'applications/a/one.md', 'one');
  execFileSync('git', ['add', '-f', 'applications'], { cwd: root });
  assert.equal(await run(['guard', '--staged'], { root, out }), 1);
  assert.equal(await run(['guard', '--staged', '--tracked'], { root, out }), 1);
  assert.equal(await run(['bogus'], { root, out }), 2);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { sha256Hex } from '../pack.mjs';
import { diffManifests, push, status } from '../sync.mjs';
import { CREDS, fakeD1, makeRoot, put } from './d1-test-kit.mjs';

const MASTER = 'packages/data/resumes/master/resume_data.json';
const NOW = '2026-01-01T00:00:00.000Z';

function setup({ masterRow = true } = {}) {
  const root = makeRoot();
  const d1 = fakeD1({ masterRow });
  put(root, 'applications/a/same.md', 'same');
  put(root, 'applications/a/changed.md', 'new body');
  put(root, 'applications/a/added.bin', Buffer.from([0, 255, 16]));
  d1.seed('applications/a/same.md', Buffer.from('same'));
  d1.seed('applications/a/changed.md', Buffer.from('old body'));
  d1.seed('applications/a/gone.md', Buffer.from('gone'));
  const lines = [];
  return {
    root,
    d1,
    lines,
    options: {
      root,
      env: CREDS,
      fetchImpl: d1.fetchImpl,
      out: (l) => lines.push(l),
      now: () => NOW,
    },
  };
}

const writes = (d1) => d1.calls.filter((c) => /^(INSERT|DELETE|UPDATE)/.test(c.sql));

test('diffManifests splits added, changed, deleted, and unchanged', () => {
  const diff = diffManifests(
    [
      { path: 'a', sha256: '1', size: 1 },
      { path: 'b', sha256: '2', size: 1 },
      { path: 'c', sha256: '3', size: 1 },
    ],
    new Map([
      ['a', '1'],
      ['b', 'x'],
      ['z', '9'],
    ])
  );
  assert.deepEqual(diff, { added: ['c'], changed: ['b'], deleted: ['z'], unchanged: ['a'] });
});

test('push upserts added and changed files byte-exact and keeps D1-only rows without --prune', async () => {
  const { d1, options } = setup();
  const diff = await push(options);
  assert.deepEqual(
    [diff.added, diff.changed, diff.deleted],
    [['applications/a/added.bin'], ['applications/a/changed.md'], ['applications/a/gone.md']]
  );
  assert.deepEqual(d1.files.get('applications/a/added.bin').body, Buffer.from([0, 255, 16]));
  assert.equal(
    d1.files.get('applications/a/changed.md').sha256,
    sha256Hex(Buffer.from('new body'))
  );
  assert.ok(d1.files.has('applications/a/gone.md'));
  assert.equal(writes(d1).filter((c) => c.sql.startsWith('INSERT')).length, 2);
});

test('push --prune deletes rows missing locally', async () => {
  const { d1, options } = setup();
  await push({ ...options, prune: true });
  assert.ok(!d1.files.has('applications/a/gone.md'));
});

test('push --dry-run reads D1 but writes nothing', async () => {
  const { d1, lines, options } = setup();
  put(options.root, MASTER, '{"personal":{}}');
  await push({ ...options, dryRun: true, prune: true });
  assert.equal(writes(d1).length, 0);
  assert.ok(lines.some((l) => l.includes('dry run')));
});

test('a new or changed master resume also updates the resumes master row only', async () => {
  const { d1, options } = setup();
  put(options.root, MASTER, '{"personal":{"name":"x"}}');
  await push(options);
  const update = d1.calls.find((c) => c.sql.startsWith('UPDATE resumes'));
  assert.ok(update.sql.includes("id = 'master'"));
  assert.ok(!update.sql.includes('target_resume_id'));
  assert.deepEqual(update.params, ['{"personal":{"name":"x"}}', NOW]);
});

test('an unchanged master resume does not touch the resumes table', async () => {
  const { d1, options } = setup();
  put(options.root, MASTER, '{"a":1}');
  d1.seed(MASTER, Buffer.from('{"a":1}'));
  await push(options);
  assert.ok(!d1.calls.some((c) => c.sql.startsWith('UPDATE resumes')));
});

test('a master file that is not JSON aborts before the resumes row changes', async () => {
  const { d1, options } = setup();
  put(options.root, MASTER, 'not json');
  await assert.rejects(push(options), SyntaxError);
  assert.ok(!d1.calls.some((c) => c.sql.startsWith('UPDATE resumes')));
});

test('status prints counts and paths without writing', async () => {
  const { d1, lines, options } = setup();
  await status(options);
  assert.equal(lines[0], 'added 1, changed 1, deleted (kept without --prune) 1, unchanged 1');
  assert.ok(lines.includes('  ~ applications/a/changed.md'));
  assert.equal(writes(d1).length, 0);
});

test('push without credentials fails closed', async () => {
  await assert.rejects(
    push({ root: makeRoot(), env: { WORKERS_CI: '1' }, out: () => {} }),
    /CONTENT_API_TOKEN/
  );
});

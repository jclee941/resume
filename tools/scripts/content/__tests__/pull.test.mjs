import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { sha256Hex } from '../pack.mjs';
import { pull, writeAtomic } from '../pull.mjs';
import { CREDS, fakeD1, makeRoot, put } from './helpers.mjs';

const quiet = () => {};

test('pull pages through D1, writes verified bytes, and records the manifest', async () => {
  const root = makeRoot();
  const d1 = fakeD1();
  for (let i = 0; i < 45; i += 1)
    d1.seed(`applications/role/f${String(i).padStart(2, '0')}.bin`, Buffer.from([i, 0, 255, i]));
  const count = await pull({ root, env: CREDS, source: 'd1', fetchImpl: d1.fetchImpl, out: quiet });
  assert.equal(count, 45);
  assert.equal(d1.calls.filter((c) => c.sql.includes('hex(body)')).length, 3);
  assert.deepEqual(
    readFileSync(path.join(root, 'applications/role/f07.bin')),
    Buffer.from([7, 0, 255, 7])
  );
  const manifest = JSON.parse(readFileSync(path.join(root, '.content/manifest.json'), 'utf8'));
  assert.equal(manifest.files.length, 45);
  assert.deepEqual(manifest.files[7], {
    path: 'applications/role/f07.bin',
    sha256: sha256Hex(Buffer.from([7, 0, 255, 7])),
    size: 4,
  });
});

test('pull rejects a row whose bytes do not match its sha256 and writes nothing for it', async () => {
  const root = makeRoot();
  const d1 = fakeD1();
  d1.seed('applications/role/bad.md', Buffer.from('tampered'), sha256Hex(Buffer.from('original')));
  await assert.rejects(
    pull({ root, env: CREDS, fetchImpl: d1.fetchImpl, out: quiet }),
    /integrity check failed for applications\/role\/bad\.md/
  );
  assert.ok(!existsSync(path.join(root, 'applications/role/bad.md')));
});

test('pull refuses D1 paths outside the pack', async () => {
  const root = makeRoot();
  const d1 = fakeD1();
  d1.seed('tools/scripts/evil.js', Buffer.from('x'));
  await assert.rejects(
    pull({ root, env: CREDS, fetchImpl: d1.fetchImpl, out: quiet }),
    /outside the pack/
  );
  assert.ok(!existsSync(path.join(root, 'tools/scripts/evil.js')));
});

test('pull fails on an empty content_files table instead of building nothing', async () => {
  await assert.rejects(
    pull({ root: makeRoot(), env: CREDS, fetchImpl: fakeD1().fetchImpl, out: quiet }),
    /returned no pack files/
  );
});

for (const workersCi of [undefined, '1']) {
  test(`pull fails closed without credentials (WORKERS_CI=${workersCi}) and never uses fixtures`, async () => {
    const root = makeRoot();
    put(root, 'tests/fixtures/content-pack/applications/x/a.md', 'fake');
    const env = workersCi ? { WORKERS_CI: workersCi } : {};
    await assert.rejects(
      pull({ root, env, out: quiet }),
      /CONTENT_API_TOKEN.*CONTENT_SOURCE=fixtures/s
    );
    assert.ok(!existsSync(path.join(root, 'applications/x/a.md')));
  });
}

test('CONTENT_SOURCE=fixtures copies fixtures onto repo paths and skips non-pack files', async () => {
  const root = makeRoot();
  put(root, 'tests/fixtures/content-pack/applications/x/a.md', 'fake');
  put(root, 'tests/fixtures/content-pack/README.md', 'notes');
  const lines = [];
  await pull({ root, env: { CONTENT_SOURCE: 'fixtures' }, out: (l) => lines.push(l) });
  assert.equal(readFileSync(path.join(root, 'applications/x/a.md'), 'utf8'), 'fake');
  assert.ok(!existsSync(path.join(root, 'README.md')));
  assert.ok(lines.some((l) => l.includes('skipped 1 fixture')));
});

test('the fixtures source names the missing directory when it is absent', async () => {
  await assert.rejects(
    pull({ root: makeRoot(), source: 'fixtures', env: {}, out: quiet }),
    /tests\/fixtures\/content-pack is missing/
  );
});

test('an unknown source is rejected', async () => {
  await assert.rejects(
    pull({ root: makeRoot(), source: 'ftp', env: {}, out: quiet }),
    /unknown content source/
  );
});

test('writeAtomic leaves no temp file behind when the rename fails', async () => {
  const root = makeRoot();
  mkdirSync(path.join(root, 'applications/x/a.md'), { recursive: true });
  await assert.rejects(writeAtomic(root, 'applications/x/a.md', Buffer.from('data')));
  assert.deepEqual(readdirSync(path.join(root, 'applications/x')), ['a.md']);
});

test('writeAtomic replaces an existing file in one step', async () => {
  const root = makeRoot();
  put(root, 'applications/x/a.md', 'old');
  await writeAtomic(root, 'applications/x/a.md', Buffer.from('new'));
  assert.equal(readFileSync(path.join(root, 'applications/x/a.md'), 'utf8'), 'new');
});

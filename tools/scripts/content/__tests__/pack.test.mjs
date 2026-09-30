import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  assertPackPath,
  buildManifest,
  contentTypeFor,
  createMatcher,
  listPackFiles,
  loadPack,
  sha256Hex,
} from '../pack.mjs';
import { makeRoot, put } from './helpers.mjs';

const pack = await loadPack();
const matcher = createMatcher(pack);

test('the pack includes every content location', () => {
  for (const p of [
    'packages/data/resumes/master/resume_data.json',
    'applications/role-2026/cover_letter.md',
    'ta/deck.pptx',
    'apps/portfolio/index.html',
    'apps/portfolio/index-en.html',
    'apps/portfolio/lib/hero-content-data.js',
    'apps/portfolio/lib/skill-radar-data.js',
    'apps/portfolio/src/scripts/modules/recruiter-enhancements-data.js',
    'apps/portfolio/manifest_en.json',
    'apps/portfolio/og-image-ja.webp',
    'apps/portfolio/og-image.png',
    'apps/portfolio/assets/profile-photo.jpg',
    'apps/portfolio/assets/resume-full.pdf',
    'apps/portfolio/downloads/RUNBOOK.docx',
    'ProfileView.jpg',
    '.sisyphus/plans/plan.md',
  ]) {
    assert.ok(matcher.matches(p), `expected ${p} in the pack`);
  }
});

test('AGENTS.md, the resume schema, .gitkeep, and code stay out of the pack', () => {
  for (const p of [
    'applications/AGENTS.md',
    'ta/AGENTS.md',
    'packages/data/resumes/master/resume_schema.json',
    'applications/role/.gitkeep',
    'apps/portfolio/lib/hero-content.js',
    'apps/portfolio/entry.js',
    'tools/scripts/content/cli.mjs',
    'README.md',
  ]) {
    assert.ok(!matcher.matches(p), `expected ${p} outside the pack`);
  }
});

test('every inventory MOVE path is matched when an inventory is supplied', (t) => {
  const inventory = process.env.CONTENT_PII_INVENTORY;
  if (!inventory) return t.skip('CONTENT_PII_INVENTORY not set');
  const moves = Object.entries(JSON.parse(readFileSync(inventory, 'utf8'))).filter(
    ([, v]) => v.action === 'MOVE'
  );
  assert.ok(moves.length > 0);
  assert.deepEqual(
    moves.map(([p]) => p).filter((p) => !matcher.matches(p)),
    []
  );
});

test('assertPackPath rejects traversal, absolute, non-normalized, and out-of-pack paths', () => {
  assert.equal(assertPackPath(matcher, 'applications/a/b.md'), 'applications/a/b.md');
  for (const bad of [
    '../applications/a.md',
    '/applications/a.md',
    'applications/../tools/x.md',
    'applications//a.md',
    'tools/scripts/content/cli.mjs',
  ]) {
    assert.throws(() => assertPackPath(matcher, bad), /outside the pack/);
  }
});

test('listPackFiles and buildManifest walk the filesystem and hash the bytes', async () => {
  const root = makeRoot();
  put(root, 'applications/a/one.md', 'one');
  put(root, 'applications/a/AGENTS.md', 'rules');
  put(root, 'applications/a/deep/two.bin', Buffer.from([0, 255, 1]));
  put(root, 'apps/portfolio/index.html', '<html>');
  put(root, 'apps/portfolio/entry.js', 'code');
  put(root, 'ProfileView.jpg', 'jpg');
  put(root, 'applications/node_modules/x/y.md', 'skipped');
  assert.deepEqual(await listPackFiles(pack, root), [
    'ProfileView.jpg',
    'applications/a/deep/two.bin',
    'applications/a/one.md',
    'apps/portfolio/index.html',
  ]);
  const manifest = await buildManifest(pack, root);
  const one = manifest.find((e) => e.path === 'applications/a/one.md');
  assert.deepEqual(one, {
    path: 'applications/a/one.md',
    sha256: sha256Hex(Buffer.from('one')),
    size: 3,
  });
});

test('contentTypeFor maps known extensions and defaults to octet-stream', () => {
  assert.equal(contentTypeFor('a/b.pdf'), 'application/pdf');
  assert.equal(contentTypeFor('a/b.unknown'), 'application/octet-stream');
});

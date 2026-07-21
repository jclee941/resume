const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const canonicalPaths = require('../resume-data-paths.js');
const { runSync } = require('../resume-sync-runner.js');
const { copyCanonicalSources, isolatedRoot } = require('./resume-sync-test-helpers.js');

describe('resume sync output safety', () => {
  it('rejects a generated output path that is a symbolic link', () => {
    // Given: a copied source set and an output symlink to an unrelated sentinel.
    const root = isolatedRoot();
    const sourceDir = copyCanonicalSources(root, canonicalPaths.LANGUAGE_SOURCES);
    const outputDir = path.join(root, 'outputs');
    const sentinel = path.join(root, 'sentinel.txt');
    fs.mkdirSync(outputDir);
    fs.writeFileSync(sentinel, 'keep');
    fs.symlinkSync(sentinel, path.join(outputDir, 'data.json'));

    // When/Then: generation refuses the symlink and preserves its target.
    assert.throws(() => runSync({ asOf: '2026-07-12', sourceDir, outputDir }), /symbolic link/i);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('preserves a pre-existing verifier parent and its contents', async () => {
    // Given: unrelated content already exists beneath the fixed verifier parent.
    const tempBase = isolatedRoot();
    const tempRoot = path.join(tempBase, 'verify-resume-sync');
    const sentinel = path.join(tempRoot, 'keep.txt');
    fs.mkdirSync(tempRoot);
    fs.writeFileSync(sentinel, 'keep');

    // When/Then: a unique child run succeeds without deleting unrelated content.
    const { verifyResumeSync } = await import('../verify-resume-sync.mjs');
    await verifyResumeSync({ tempBase, asOf: '2026-07-12' });
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
    fs.rmSync(tempBase, { recursive: true });
  });

  it('preserves a pre-existing symbolic link under the verifier parent', async () => {
    // Given: unrelated linked content already exists beneath the fixed parent.
    const tempBase = isolatedRoot();
    const tempRoot = path.join(tempBase, 'verify-resume-sync');
    const externalMarker = path.join(tempBase, 'external-marker');
    const sentinel = path.join(tempRoot, 'keep.txt');
    fs.mkdirSync(tempRoot);
    fs.writeFileSync(externalMarker, 'external');
    fs.writeFileSync(sentinel, 'keep');
    fs.symlinkSync(externalMarker, path.join(tempRoot, 'linked-marker'));

    // When/Then: a unique child run leaves both entries untouched.
    const { verifyResumeSync } = await import('../verify-resume-sync.mjs');
    await verifyResumeSync({ tempBase, asOf: '2026-07-12' });
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
    assert.equal(fs.readFileSync(path.join(tempRoot, 'linked-marker'), 'utf8'), 'external');
    fs.rmSync(tempBase, { recursive: true });
  });

  it('preserves a victim swapped onto the verifier temp path', async () => {
    // Given: generation swaps a pre-existing victim onto the active verifier path.
    const tempBase = isolatedRoot();
    const victim = path.join(tempBase, 'victim');
    const displaced = path.join(tempBase, 'displaced-verifier');
    fs.mkdirSync(victim);
    fs.writeFileSync(path.join(victim, 'keep.txt'), 'keep');
    let activeRoot;
    const swappingGenerator = ({ outputDir }) => {
      activeRoot = path.dirname(outputDir);
      fs.renameSync(activeRoot, displaced);
      fs.renameSync(victim, activeRoot);
      throw new Error('deterministic path swap');
    };

    // When/Then: cleanup must not recursively delete the swapped-in victim.
    const { verifyResumeSync } = await import('../verify-resume-sync.mjs');
    try {
      await assert.rejects(
        verifyResumeSync({ tempBase, asOf: '2026-07-12', generate: swappingGenerator }),
        /path swap/
      );
      assert.equal(fs.readFileSync(path.join(activeRoot, 'keep.txt'), 'utf8'), 'keep');
    } finally {
      fs.rmSync(tempBase, { recursive: true, force: true });
    }
  });

  it('rejects an output directory below a symbolic-link ancestor', () => {
    // Given: the requested output path traverses a symlink into an external directory.
    const root = isolatedRoot();
    const sourceDir = copyCanonicalSources(root, canonicalPaths.LANGUAGE_SOURCES);
    const externalDir = path.join(root, 'external');
    const linkedParent = path.join(root, 'linked-parent');
    const outputDir = path.join(linkedParent, 'nested');
    fs.mkdirSync(externalDir);
    fs.writeFileSync(path.join(externalDir, 'keep.txt'), 'keep');
    fs.symlinkSync(externalDir, linkedParent);

    // When/Then: generation rejects before snapshots escape the requested path boundary.
    try {
      assert.throws(
        () => runSync({ asOf: '2026-07-12', sourceDir, outputDir }),
        /symbolic link.*output directory/i
      );
      assert.deepEqual(fs.readdirSync(externalDir), ['keep.txt']);
      assert.equal(fs.readFileSync(path.join(externalDir, 'keep.txt'), 'utf8'), 'keep');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('preserves a contract-shaped victim swapped onto the verifier path', async () => {
    // Given: every known cleanup filename exists in a victim swapped onto the active path.
    const tempBase = isolatedRoot();
    const victim = path.join(tempBase, 'victim');
    const displaced = path.join(tempBase, 'displaced-verifier');
    for (const child of ['sources', 'run-1', 'run-2']) {
      fs.mkdirSync(path.join(victim, child), { recursive: true });
    }
    for (const source of canonicalPaths.LANGUAGE_SOURCES) {
      fs.writeFileSync(path.join(victim, 'sources', path.basename(source.sourcePath)), 'victim');
    }
    for (const run of ['run-1', 'run-2']) {
      for (const name of ['data.json', 'data_en.json', 'data_ja.json']) {
        fs.writeFileSync(path.join(victim, run, name), 'victim');
      }
    }
    let activeRoot;
    const swappingGenerator = ({ outputDir }) => {
      activeRoot = path.dirname(outputDir);
      fs.renameSync(activeRoot, displaced);
      fs.renameSync(victim, activeRoot);
      throw new Error('contract-shaped path swap');
    };

    // When/Then: FD-bound cleanup leaves the replacement root and known file untouched.
    const { verifyResumeSync } = await import('../verify-resume-sync.mjs');
    try {
      await assert.rejects(
        verifyResumeSync({ tempBase, asOf: '2026-07-12', generate: swappingGenerator }),
        /path swap/
      );
      assert.equal(fs.readFileSync(path.join(activeRoot, 'run-1/data.json'), 'utf8'), 'victim');
      assert.equal(fs.existsSync(activeRoot), true);
    } finally {
      fs.rmSync(tempBase, { recursive: true, force: true });
    }
  });

  it('rejects a directory swap immediately before the first output open', () => {
    // Given: openSync swaps the pinned output path to a symlink immediately before data.json.
    const root = isolatedRoot();
    const sourceDir = copyCanonicalSources(root, canonicalPaths.LANGUAGE_SOURCES);
    const outputDir = path.join(root, 'outputs');
    const displaced = path.join(root, 'displaced-outputs');
    const externalDir = path.join(root, 'external');
    fs.mkdirSync(externalDir);
    fs.writeFileSync(path.join(externalDir, 'keep.txt'), 'keep');
    const originalOpen = fs.openSync;
    let swapped = false;
    fs.openSync = (filePath, ...args) => {
      if (!swapped && path.basename(String(filePath)) === 'data.json') {
        fs.renameSync(outputDir, displaced);
        fs.symlinkSync(externalDir, outputDir);
        swapped = true;
      }
      return originalOpen(filePath, ...args);
    };

    // When/Then: the run fails closed, external state is untouched, and pinned writes are cleaned.
    try {
      assert.throws(
        () => runSync({ asOf: '2026-07-12', sourceDir, outputDir }),
        /output directory identity changed/i
      );
      assert.deepEqual(fs.readdirSync(externalDir), ['keep.txt']);
      assert.deepEqual(fs.readdirSync(displaced), []);
    } finally {
      fs.openSync = originalOpen;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

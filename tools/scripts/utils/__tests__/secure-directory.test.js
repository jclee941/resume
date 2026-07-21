const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const canonicalPaths = require('../resume-data-paths.js');
const { runSync } = require('../resume-sync-runner.js');
const { copyCanonicalSources, isolatedRoot } = require('./resume-sync-test-helpers.js');

describe('secure directory platform gate', () => {
  it('fails closed before output creation when FD-relative access is unavailable', () => {
    // Given: the Linux directory-FD surface is unavailable.
    const root = isolatedRoot();
    const sourceDir = copyCanonicalSources(root, canonicalPaths.LANGUAGE_SOURCES);
    const outputDir = path.join(root, 'outputs');
    const originalExists = fs.existsSync;
    fs.existsSync = (filePath) =>
      filePath === '/proc/self/fd' ? false : originalExists.call(fs, filePath);

    // When/Then: generation fails before creating its output directory.
    try {
      assert.throws(
        () => runSync({ asOf: '2026-07-12', sourceDir, outputDir }),
        /FD relative access is unavailable/i
      );
      assert.equal(originalExists.call(fs, outputDir), false);
    } finally {
      fs.existsSync = originalExists;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

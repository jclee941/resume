import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { REPO_ROOT, loadPack } from '../pack.mjs';

const GITIGNORE = path.join(REPO_ROOT, '.gitignore');

/** A concrete path a glob matches: ** becomes a directory chain, * a word, {a,b} its first choice. */
function sampleFor(glob) {
  return glob
    .replace(/\{([^,}]+)[^}]*\}/g, '$1')
    .replace(/\/\*\*$/, '/nested/sample.md')
    .replace(/\*/g, 'sample');
}

function ignoredBy(repo, repoPath) {
  const result = spawnSync('git', ['check-ignore', '-q', '--no-index', repoPath], { cwd: repo });
  assert.notEqual(result.status, 128, result.stderr.toString());
  return result.status === 0;
}

function makeRepo() {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'gitignore-test-'));
  execFileSync('git', ['init', '-q'], { cwd: repo });
  copyFileSync(GITIGNORE, path.join(repo, '.gitignore'));
  return repo;
}

test('every include glob of the pack definition is ignored', async () => {
  const repo = makeRepo();
  for (const glob of (await loadPack()).include) {
    assert.equal(ignoredBy(repo, sampleFor(glob)), true, glob);
  }
});

test('agent guides, the resume schema, placeholders, and the fixtures stay tracked', () => {
  const repo = makeRepo();
  for (const repoPath of [
    'applications/AGENTS.md',
    'packages/data/resumes/AGENTS.md',
    'packages/data/resumes/master/resume_schema.json',
    'applications/nested/.gitkeep',
    'tests/fixtures/content-pack/applications/nested/sample.md',
    'tests/fixtures/content-pack/packages/data/resumes/generated/ta.pptx',
    'tests/fixtures/content-pack/apps/portfolio/index.html',
  ]) {
    assert.equal(ignoredBy(repo, repoPath), false, repoPath);
  }
});

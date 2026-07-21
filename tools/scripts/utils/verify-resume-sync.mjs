#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validatePortfolioData } from '../../../packages/schemas/src/portfolio.js';
import paths from './resume-data-paths.js';
import runner from './resume-sync-runner.js';
import secureDirectory from './secure-directory.js';
import sourceValidator from './validate-resume-data.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const outputNames = ['data.json', 'data_en.json', 'data_ja.json'];
const childNames = ['sources', 'run-1', 'run-2'];

function assertExactOutputs(outputDir) {
  const actual = fs.readdirSync(outputDir).sort();
  const expected = [...outputNames].sort();
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw new Error(`generated outputs must be exactly: ${outputNames.join(', ')}`);
  }
}

function prepareTempRoot(tempBase) {
  secureDirectory.requireFdRelativeSupport();
  const tempParent = path.join(tempBase, 'verify-resume-sync');
  fs.mkdirSync(tempParent, { recursive: true });
  const tempRoot = fs.mkdtempSync(path.join(tempParent, 'run-'));
  const root = secureDirectory.openPinnedDirectory(tempRoot);
  const children = new Map();
  try {
    for (const name of childNames) {
      const fdPath = secureDirectory.leafPath(root, name);
      const originalPath = path.join(tempRoot, name);
      fs.mkdirSync(fdPath);
      children.set(name, secureDirectory.openPinnedDirectory(fdPath, originalPath));
    }
    return { children, root, tempRoot };
  } catch (error) {
    for (const binding of children.values()) secureDirectory.closePinnedDirectory(binding);
    secureDirectory.closePinnedDirectory(root);
    throw error;
  }
}

function removeKnownFile(binding, name) {
  try {
    fs.unlinkSync(secureDirectory.leafPath(binding, name));
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
}

function cleanupTempRoot({ children, root, tempRoot }) {
  const sourceNames = paths.LANGUAGE_SOURCES.map(({ sourcePath }) => path.basename(sourcePath));
  for (const name of sourceNames) removeKnownFile(children.get('sources'), name);
  for (const run of ['run-1', 'run-2']) {
    for (const name of outputNames) removeKnownFile(children.get(run), name);
  }

  const rootMatches = secureDirectory.matchesOriginal(root);
  if (rootMatches) {
    for (const [name, binding] of children) {
      if (secureDirectory.matchesOriginal(binding)) {
        fs.rmdirSync(secureDirectory.leafPath(root, name));
      }
    }
  }
  for (const binding of children.values()) secureDirectory.closePinnedDirectory(binding);
  if (rootMatches && secureDirectory.matchesOriginal(root)) fs.rmdirSync(tempRoot);
  secureDirectory.closePinnedDirectory(root);
}

export async function verifyResumeSync({
  asOf = new Date().toISOString().slice(0, 10),
  tempBase = path.join(repoRoot, '.tmp'),
  generate = runner.runSync,
  validateGenerated = validatePortfolioData,
} = {}) {
  runner.parseAsOf(asOf);
  const temp = prepareTempRoot(tempBase);
  const { children, tempRoot } = temp;
  const sourceDir = path.join(tempRoot, 'sources');
  const run1 = path.join(tempRoot, 'run-1');
  const run2 = path.join(tempRoot, 'run-2');

  try {
    const sourceBinding = children.get('sources');
    for (const source of paths.LANGUAGE_SOURCES) {
      const sourceName = path.basename(source.sourcePath);
      const copiedPath = secureDirectory.leafPath(sourceBinding, sourceName);
      fs.copyFileSync(source.sourcePath, copiedPath);
      const validation = sourceValidator.validateResumeDataFile(copiedPath, paths.SCHEMA_PATH);
      if (!validation.valid) {
        throw new Error(
          `copied resume source validation failed (${source.language}):${sourceValidator.formatErrors(validation.errors)}`
        );
      }
    }

    await generate({ asOf, sourceDir, outputDir: run1 });
    await generate({ asOf, sourceDir, outputDir: run2 });
    assertExactOutputs(run1);
    assertExactOutputs(run2);

    for (const name of outputNames) {
      const first = fs.readFileSync(path.join(run1, name));
      const second = fs.readFileSync(path.join(run2, name));
      validateGenerated(JSON.parse(first.toString('utf8')));
      validateGenerated(JSON.parse(second.toString('utf8')));
      if (!first.equals(second)) throw new Error(`nondeterministic generated snapshot: ${name}`);
    }
    console.log(`verify-resume-sync passed asOf=${asOf}`);
  } finally {
    cleanupTempRoot(temp);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyResumeSync().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { fakeFile } from './fixtures/fake-file.mjs';
import { compileGlobs } from './glob.mjs';
import { collectEnums } from './fixtures/json-faker.mjs';
import { synthesizeFixtures } from './fixtures/synthesized.mjs';
import { setKeepPhrases } from './fixtures/text-faker.mjs';
import { loadUiPhrases } from './fixtures/ui-labels.mjs';
import { FIXTURES_DIR, REPO_ROOT, listPackFiles, loadPack } from './pack.mjs';

const SCHEMA_PATH = 'packages/data/resumes/master/resume_schema.json';
// Pack files the build, lint, typecheck, and test commands read. Everything else stays real-only.
export const FIXTURE_SELECTION = [
  'packages/data/resumes/master/*.json',
  'packages/data/resumes/master/*.jpg',
  'packages/data/resumes/master/resume_master.md',
  'packages/data/resumes/master/resume_summary.md',
  'packages/data/resumes/generated/ta.pptx',
  'apps/portfolio/index.html',
  'apps/portfolio/index-en.html',
  'apps/portfolio/manifest*.json',
  'apps/portfolio/og-image*.{png,webp}',
  'apps/portfolio/lib/*.js',
  'apps/portfolio/src/scripts/modules/*-data.js',
  'apps/portfolio/assets/*',
  'apps/portfolio/downloads/*',
];

/**
 * Regenerate the fake pack from a materialized real pack. Output depends only on the real files,
 * so re-running it on an unchanged pack rewrites identical bytes.
 * @param {{ root?: string, out?: string, log?: (line: string) => void }} [options]
 * @returns {Promise<string[]>} generated fixture paths
 */
export async function makeFixtures({
  root = REPO_ROOT,
  out = FIXTURES_DIR,
  log = console.log,
} = {}) {
  const select = compileGlobs(FIXTURE_SELECTION);
  const files = (await listPackFiles(await loadPack(), root)).filter((file) => select(file));
  if (files.length === 0) {
    throw new Error('no pack files are materialized; run npm run content:pull first');
  }
  const enums = collectEnums(JSON.parse(await fs.readFile(path.join(root, SCHEMA_PATH), 'utf8')));
  setKeepPhrases(await loadUiPhrases(root));
  const target = path.resolve(root, out);
  await fs.rm(target, { recursive: true, force: true });
  for (const file of files) {
    const bytes = await fs.readFile(path.join(root, file));
    const destination = path.join(target, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, fakeFile(file, bytes, { enums }));
  }
  const written = [...files];
  const readFake = (file) => fs.readFile(path.join(target, file), 'utf8');
  for (const [file, content] of await synthesizeFixtures(readFake)) {
    const destination = path.join(target, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content);
    written.push(file);
  }
  log(`wrote ${written.length} fixture files to ${out}`);
  return written;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { root: { type: 'string' }, out: { type: 'string' } } });
  await makeFixtures({ root: values.root, out: values.out });
}

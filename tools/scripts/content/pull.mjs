import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createD1Client } from './d1-client.mjs';
import {
  FIXTURES_DIR,
  REPO_ROOT,
  assertPackPath,
  createMatcher,
  loadPack,
  sha256Hex,
} from './pack.mjs';
import { readFiles } from './store.mjs';

export const MANIFEST_PATH = '.content/manifest.json';

/**
 * @param {string | undefined} flag
 * @param {Record<string, string | undefined>} env
 * @returns {'d1' | 'fixtures'}
 */
export function resolveSource(flag, env) {
  const source = flag || env.CONTENT_SOURCE || 'd1';
  if (source !== 'd1' && source !== 'fixtures') {
    throw new Error(`unknown content source ${JSON.stringify(source)} (use d1 or fixtures)`);
  }
  return source;
}

/**
 * Write via a temp file in the same directory, then rename.
 * @param {string} root
 * @param {string} repoPath
 * @param {Buffer} bytes
 */
export async function writeAtomic(root, repoPath, bytes) {
  const target = path.join(root, repoPath);
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error(`refusing to write outside the repo: ${JSON.stringify(repoPath)}`);
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temp, bytes);
    await fs.rename(temp, target);
  } catch (error) {
    await fs.rm(temp, { force: true });
    throw error;
  }
}

/**
 * @param {string} root
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listFixtureFiles(root, dir) {
  const entries = await fs.readdir(path.join(root, dir), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const child = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return listFixtureFiles(root, child);
      return entry.isFile() ? [child] : [];
    })
  );
  return nested.flat();
}

/**
 * Read the fixture pack: every file under the fixtures dir that the pack definition matches.
 * @param {string} root
 * @param {(line: string) => void} out
 * @returns {Promise<Array<import('./pack.mjs').ManifestEntry & { bytes: Buffer }>>}
 */
export async function loadFixtures(root, out) {
  const matcher = createMatcher(await loadPack());
  const files = await listFixtureFiles(root, FIXTURES_DIR).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    throw new Error(
      `${FIXTURES_DIR} is missing; nothing to materialize with CONTENT_SOURCE=fixtures`
    );
  });
  const fixtures = [];
  let skipped = 0;
  for (const file of files) {
    const repoPath = file.slice(FIXTURES_DIR.length + 1);
    if (!matcher.matches(repoPath)) {
      skipped += 1;
      continue;
    }
    const bytes = await fs.readFile(path.join(root, file));
    fixtures.push({ path: repoPath, bytes, sha256: sha256Hex(bytes), size: bytes.length });
  }
  if (skipped) out(`skipped ${skipped} fixture files outside the pack`);
  return fixtures;
}

/**
 * @param {string} root
 * @param {(line: string) => void} out
 * @returns {Promise<import('./pack.mjs').ManifestEntry[]>}
 */
async function pullFixtures(root, out) {
  const entries = [];
  for (const { path: repoPath, bytes, sha256, size } of await loadFixtures(root, out)) {
    await writeAtomic(root, repoPath, bytes);
    entries.push({ path: repoPath, sha256, size });
  }
  return entries;
}

/**
 * @param {string} root
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<import('./pack.mjs').ManifestEntry[]>}
 */
async function pullD1(root, env, fetchImpl) {
  const client = createD1Client({ env, root, fetchImpl });
  const matcher = createMatcher(await loadPack());
  const entries = [];
  for await (const row of readFiles(client)) {
    assertPackPath(matcher, row.path);
    const sha256 = sha256Hex(row.bytes);
    if (sha256 !== row.sha256 || row.bytes.length !== row.size) {
      throw new Error(`content_files integrity check failed for ${row.path}`);
    }
    await writeAtomic(root, row.path, row.bytes);
    entries.push({ path: row.path, sha256, size: row.size, updated_at: row.updatedAt });
  }
  return entries;
}

/**
 * Materialize the pack and write the gitignored manifest. Never falls back between sources.
 * @param {{ root?: string, env?: Record<string, string | undefined>, source?: string, fetchImpl?: typeof fetch, out?: (line: string) => void }} [options]
 * @returns {Promise<number>} files written
 */
export async function pull({
  root = REPO_ROOT,
  env = process.env,
  source,
  fetchImpl,
  out = console.log,
} = {}) {
  const chosen = resolveSource(source, env);
  const entries =
    chosen === 'fixtures' ? await pullFixtures(root, out) : await pullD1(root, env, fetchImpl);
  if (entries.length === 0) throw new Error(`content source ${chosen} returned no pack files`);
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const manifest = JSON.stringify({ version: 1, source: chosen, files: entries }, null, 2);
  await writeAtomic(root, MANIFEST_PATH, Buffer.from(`${manifest}\n`));
  const bytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  out(`pulled ${entries.length} files (${bytes} bytes) from ${chosen}`);
  return entries.length;
}

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, sha256Hex } from './pack.mjs';
import { MANIFEST_PATH, loadFixtures, pull, resolveSource } from './pull.mjs';

const PULL_HINT = 'run `npm run content:pull` (op run --env-file ... -- npm run content:pull)';

/**
 * @param {string} root
 * @returns {Promise<Map<string, string> | null>} sha256 by path from the last pull, or null
 */
async function readManifest(root) {
  let text;
  try {
    text = await fs.readFile(path.join(root, MANIFEST_PATH), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  const files = JSON.parse(text).files;
  return new Map(files.map((file) => [file.path, file.sha256]));
}

/**
 * @param {string} root
 * @param {string} repoPath
 * @returns {Promise<string | null>} sha256 of the local file, or null when absent
 */
async function localHash(root, repoPath) {
  try {
    return sha256Hex(await fs.readFile(path.join(root, repoPath)));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Materialize the fixtures without clobbering local pack files that changed since the last pull.
 * @param {{ root: string, env: Record<string, string | undefined>, out: (line: string) => void, warn: (line: string) => void, force?: boolean }} options
 */
async function ensureFixtures({ root, env, out, warn, force }) {
  const manifest = await readManifest(root);
  const conflicts = [];
  for (const fixture of await loadFixtures(root, out)) {
    const local = await localHash(root, fixture.path);
    const known = manifest?.get(fixture.path);
    if (local && local !== fixture.sha256 && local !== known) conflicts.push(fixture.path);
  }
  if (conflicts.length > 0 && !force) {
    throw new Error(
      `refusing to overwrite ${conflicts.length} local pack files that differ from the last pull ` +
        `(unpushed edits?): ${conflicts.join(', ')}. Run \`npm run content:push\` first, or pass --force.`
    );
  }
  await pull({ root, env, source: 'fixtures', out, warn });
}

/**
 * Local development: the pack must already be materialized; drift is a warning because
 * previewing unpushed edits is legitimate.
 * @param {{ root: string, out: (line: string) => void, warn: (line: string) => void }} options
 */
async function requireMaterialized({ root, out, warn }) {
  const manifest = await readManifest(root);
  if (!manifest) throw new Error(`no content pack is materialized; ${PULL_HINT}`);
  const missing = [];
  const drifted = [];
  for (const [repoPath, sha256] of manifest) {
    const local = await localHash(root, repoPath);
    if (local === null) missing.push(repoPath);
    else if (local !== sha256) drifted.push(repoPath);
  }
  if (missing.length > 0) {
    throw new Error(
      `${missing.length} pack files are missing (${missing.join(', ')}); ${PULL_HINT}`
    );
  }
  if (drifted.length > 0) {
    warn(
      `content: ${drifted.length} local pack files differ from the last pull ` +
        `(${drifted.join(', ')}); build previews them, run \`npm run content:push\` to publish`
    );
  }
  out(`content pack ready: ${manifest.size} files`);
}

/**
 * Build-time materialization policy. Never falls back between sources.
 * - WORKERS_CI=1: pull from D1; fail closed without credentials; fixtures are refused.
 * - CONTENT_SOURCE=fixtures: fake pack, never over unpushed local edits (unless force).
 * - CONTENT_SOURCE=d1: pull from D1.
 * - otherwise (local dev): require a previously materialized pack.
 * @param {{ root?: string, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch, out?: (line: string) => void, warn?: (line: string) => void, force?: boolean }} [options]
 */
export async function ensure({
  root = REPO_ROOT,
  env = process.env,
  fetchImpl,
  out = console.log,
  warn = console.warn,
  force = false,
} = {}) {
  const workers = env.WORKERS_CI === '1';
  const source = env.CONTENT_SOURCE ? resolveSource(undefined, env) : undefined;
  if (workers && source === 'fixtures') {
    throw new Error(
      'WORKERS_CI=1 builds the real content pack; CONTENT_SOURCE=fixtures is refused'
    );
  }
  if (workers || source === 'd1') {
    await pull({ root, env, source: 'd1', fetchImpl, out, warn });
  } else if (source === 'fixtures') {
    await ensureFixtures({ root, env, out, warn, force });
  } else {
    await requireMaterialized({ root, out, warn });
  }
}

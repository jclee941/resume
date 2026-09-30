import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createD1Client } from './d1-client.mjs';
import { REPO_ROOT, buildManifest, contentTypeFor, loadPack } from './pack.mjs';
import {
  MASTER_RESUME_PATH,
  deleteFile,
  listRemote,
  updateMasterResume,
  upsertFile,
} from './store.mjs';

/**
 * @typedef {{ added: string[], changed: string[], deleted: string[], unchanged: string[] }} ContentDiff
 */

/**
 * @param {import('./pack.mjs').ManifestEntry[]} local
 * @param {Map<string, string>} remote path -> sha256
 * @returns {ContentDiff}
 */
export function diffManifests(local, remote) {
  const diff = { added: [], changed: [], deleted: [], unchanged: [] };
  const seen = new Set();
  for (const entry of local) {
    seen.add(entry.path);
    if (!remote.has(entry.path)) diff.added.push(entry.path);
    else if (remote.get(entry.path) !== entry.sha256) diff.changed.push(entry.path);
    else diff.unchanged.push(entry.path);
  }
  diff.deleted = [...remote.keys()].filter((p) => !seen.has(p)).sort();
  return diff;
}

/**
 * @param {ContentDiff} diff
 * @param {(line: string) => void} out
 * @param {{ prune?: boolean }} [flags]
 */
function report(diff, out, flags = {}) {
  const deletedLabel = flags.prune ? 'deleted' : 'deleted (kept without --prune)';
  out(
    `added ${diff.added.length}, changed ${diff.changed.length}, ${deletedLabel} ${diff.deleted.length}, unchanged ${diff.unchanged.length}`
  );
  for (const [sign, paths] of [
    ['+', diff.added],
    ['~', diff.changed],
    ['-', diff.deleted],
  ]) {
    for (const p of paths) out(`  ${sign} ${p}`);
  }
}

/**
 * @typedef {{ root?: string, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch, out?: (line: string) => void, now?: () => string }} SyncOptions
 */

/**
 * @param {SyncOptions} [options]
 * @returns {Promise<ContentDiff>}
 */
export async function status({
  root = REPO_ROOT,
  env = process.env,
  fetchImpl,
  out = console.log,
} = {}) {
  const client = createD1Client({ env, root, fetchImpl });
  const diff = diffManifests(await buildManifest(await loadPack(), root), await listRemote(client));
  report(diff, out);
  return diff;
}

/**
 * Upsert new/changed files, delete D1-only rows with --prune, refresh the master resume row.
 * @param {SyncOptions & { dryRun?: boolean, prune?: boolean }} [options]
 * @returns {Promise<ContentDiff>}
 */
export async function push({
  root = REPO_ROOT,
  env = process.env,
  fetchImpl,
  out = console.log,
  now = () => new Date().toISOString(),
  dryRun = false,
  prune = false,
} = {}) {
  const client = createD1Client({ env, root, fetchImpl });
  const local = await buildManifest(await loadPack(), root);
  const diff = diffManifests(local, await listRemote(client));
  report(diff, out, { prune });
  if (dryRun) {
    out('dry run: nothing written');
    return diff;
  }
  const sha = new Map(local.map((entry) => [entry.path, entry.sha256]));
  for (const repoPath of [...diff.added, ...diff.changed]) {
    const bytes = await fs.readFile(path.join(root, repoPath));
    await upsertFile(client, {
      path: repoPath,
      bytes,
      sha256: sha.get(repoPath),
      contentType: contentTypeFor(repoPath),
      now: now(),
    });
  }
  if (prune) for (const repoPath of diff.deleted) await deleteFile(client, repoPath);
  if ([...diff.added, ...diff.changed].includes(MASTER_RESUME_PATH)) {
    const json = await fs.readFile(path.join(root, MASTER_RESUME_PATH), 'utf8');
    JSON.parse(json);
    const changes = await updateMasterResume(client, json, now());
    out(
      changes > 0 ? 'updated resumes master row' : 'resumes master row not found; nothing updated'
    );
  }
  out(
    `pushed ${diff.added.length + diff.changed.length} files${prune ? `, pruned ${diff.deleted.length}` : ''}`
  );
  return diff;
}

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { assertPackPath, createMatcher, loadPack, sha256Hex } from './pack.mjs';

export const MANIFEST_PATH = '.content/manifest.json';

/**
 * The manifest the last pull wrote, or null when there is none (or it is unreadable).
 * @param {string} root
 * @returns {Promise<import('./pack.mjs').ManifestEntry[] | null>}
 */
export async function readPreviousManifest(root) {
  try {
    const parsed = JSON.parse(await fs.readFile(path.join(root, MANIFEST_PATH), 'utf8'));
    return Array.isArray(parsed.files) ? parsed.files : null;
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

/**
 * Delete files the previous pull wrote that the new source no longer has, so the working tree
 * mirrors the new source. A file is removed only while its sha256 still equals the one the
 * previous manifest recorded; anything edited since is kept and reported. Files absent from the
 * previous manifest are never touched. Output is paths and counts only.
 * @param {{ root: string, previous: import('./pack.mjs').ManifestEntry[] | null, entries: import('./pack.mjs').ManifestEntry[], out: (line: string) => void, warn: (line: string) => void }} options
 * @returns {Promise<{ removed: number, kept: number }>}
 */
export async function pruneStale({ root, previous, entries, out, warn }) {
  const counts = { removed: 0, kept: 0 };
  if (!previous) return counts;
  const matcher = createMatcher(await loadPack());
  const current = new Set(entries.map((entry) => entry.path));
  for (const { path: repoPath, sha256 } of previous) {
    if (current.has(repoPath)) continue;
    assertPackPath(matcher, repoPath);
    let bytes;
    try {
      bytes = await fs.readFile(path.join(root, repoPath));
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (sha256Hex(bytes) === sha256) {
      await fs.rm(path.join(root, repoPath));
      counts.removed += 1;
    } else {
      counts.kept += 1;
      warn(`content: kept ${repoPath}: not in the new source but edited since the last pull`);
    }
  }
  if (counts.removed > 0 || counts.kept > 0) {
    out(`pruned stale files: removed ${counts.removed}, kept ${counts.kept}`);
  }
  return counts;
}

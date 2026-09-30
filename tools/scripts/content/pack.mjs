import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import picomatch from 'picomatch';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '../../..');
export const PACK_FILE = path.join(HERE, 'content-pack.json');
export const FIXTURES_DIR = 'tests/fixtures/content-pack';
const SKIP_DIRS = new Set(['.git', 'node_modules', '.content', '.wrangler']);
const GLOB_CHARS = /[*?[\]{}()!]/;
const CONTENT_TYPES = {
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.py': 'text/x-python',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/**
 * @typedef {{ include: string[], exclude: string[] }} PackDefinition
 * @typedef {{ path: string, sha256: string, size: number }} ManifestEntry
 * @typedef {{ matches: (repoPath: string) => boolean }} PackMatcher
 */

/**
 * Load the committed pack definition.
 * @param {string} [file]
 * @returns {Promise<PackDefinition>}
 */
export async function loadPack(file = PACK_FILE) {
  const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const key of ['include', 'exclude']) {
    if (!Array.isArray(parsed[key]) || !parsed[key].every((g) => typeof g === 'string')) {
      throw new Error(`content-pack.json: "${key}" must be an array of glob strings`);
    }
  }
  return { include: parsed.include, exclude: parsed.exclude };
}

/**
 * @param {PackDefinition} pack
 * @returns {PackMatcher}
 */
export function createMatcher(pack) {
  const included = picomatch(pack.include, { dot: true });
  const excluded = picomatch(pack.exclude, { dot: true });
  return { matches: (repoPath) => included(repoPath) && !excluded(repoPath) };
}

/**
 * @param {Buffer | Uint8Array} bytes
 * @returns {string}
 */
export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * @param {string} repoPath
 * @returns {string}
 */
export function contentTypeFor(repoPath) {
  return CONTENT_TYPES[path.posix.extname(repoPath).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Reject anything that is not a normalized, relative, in-pack POSIX path.
 * @param {PackMatcher} matcher
 * @param {string} repoPath
 * @returns {string}
 */
export function assertPackPath(matcher, repoPath) {
  const normalized = path.posix.normalize(repoPath);
  const safe = normalized === repoPath && !path.posix.isAbsolute(repoPath);
  if (!safe || repoPath.split('/').includes('..') || !matcher.matches(repoPath)) {
    throw new Error(`refusing content path outside the pack: ${JSON.stringify(repoPath)}`);
  }
  return repoPath;
}

/**
 * Recursively list regular files under a repo-relative directory.
 * @param {string} root
 * @param {string} rel
 * @param {number} depth
 * @param {(repoPath: string) => void} onFile
 */
async function walk(root, rel, depth, onFile) {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, rel), { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return;
    throw error;
  }
  for (const entry of entries) {
    const child = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isFile()) onFile(child);
    else if (entry.isDirectory() && depth > 1 && !SKIP_DIRS.has(entry.name)) {
      await walk(root, child, depth - 1, onFile);
    }
  }
}

/**
 * Walk the filesystem (not git) for files the pack matches, sorted by path.
 * @param {PackDefinition} pack
 * @param {string} [root]
 * @returns {Promise<string[]>}
 */
export async function listPackFiles(pack, root = REPO_ROOT) {
  const matcher = createMatcher(pack);
  const found = new Set();
  const onFile = (repoPath) => matcher.matches(repoPath) && found.add(repoPath);
  for (const glob of pack.include) {
    const segments = glob.split('/');
    const firstGlob = segments.findIndex((s) => GLOB_CHARS.test(s));
    if (firstGlob === -1) {
      if ((await fs.lstat(path.join(root, glob)).catch(() => null))?.isFile()) onFile(glob);
      continue;
    }
    const rest = segments.slice(firstGlob);
    const depth = rest.includes('**') ? Infinity : rest.length;
    await walk(root, segments.slice(0, firstGlob).join('/'), depth, onFile);
  }
  return [...found].sort();
}

/**
 * Hash every pack file on disk.
 * @param {PackDefinition} pack
 * @param {string} [root]
 * @returns {Promise<ManifestEntry[]>}
 */
export async function buildManifest(pack, root = REPO_ROOT) {
  const files = await listPackFiles(pack, root);
  return Promise.all(
    files.map(async (repoPath) => {
      const bytes = await fs.readFile(path.join(root, repoPath));
      return { path: repoPath, sha256: sha256Hex(bytes), size: bytes.length };
    })
  );
}

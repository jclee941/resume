const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONTENT_PATHS = [
  'packages/data/resumes/master',
  'apps/portfolio/index.html',
  'apps/portfolio/index-en.html',
  'apps/portfolio/src',
  'apps/portfolio/lib',
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MANIFEST_PATH = '.content/manifest.json';

/**
 * @typedef {(command: string, options: { cwd: string; encoding: 'utf-8'; stdio: ['ignore', 'pipe', 'ignore'] }) => string} ExecFn
 */

/**
 * @param {string} pathArgs
 * @param {string} repoRoot
 * @param {ExecFn} exec
 * @returns {string | null}
 */
function lastCommitDate(pathArgs, repoRoot, exec) {
  try {
    const date = exec(`git log -1 --format=%cs ${pathArgs}`.trim(), {
      cwd: repoRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return ISO_DATE.test(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} entryPath
 * @returns {boolean}
 */
function isContentPath(entryPath) {
  return CONTENT_PATHS.some((p) => entryPath === p || entryPath.startsWith(`${p}/`));
}

/**
 * Latest `updated_at` day (YYYY-MM-DD) among content-path entries of the pulled
 * pack manifest; null when the manifest is missing, malformed or has none.
 * @param {() => string} readManifest
 * @returns {string | null}
 */
function latestManifestDate(readManifest) {
  let files;
  try {
    files = JSON.parse(readManifest()).files;
  } catch {
    return null;
  }
  if (!Array.isArray(files)) return null;
  let latest = null;
  for (const entry of files) {
    if (!entry || typeof entry.path !== 'string' || !isContentPath(entry.path)) continue;
    const day = typeof entry.updated_at === 'string' ? entry.updated_at.slice(0, 10) : '';
    if (!ISO_DATE.test(day) || Number.isNaN(Date.parse(day))) continue;
    if (latest === null || day > latest) latest = day;
  }
  return latest;
}

/**
 * Sitemap `<lastmod>` / `Last-Modified` date (YYYY-MM-DD): the last commit that
 * touched rendered content, else the HEAD commit (shallow CI clones keep no
 * older history), pushed forward by the newest D1 `updated_at` of a content path
 * in `.content/manifest.json` (content updates create no git commit); the build
 * day only when both are unavailable.
 * @param {{ repoRoot?: string, exec?: ExecFn, now?: () => Date, readManifest?: () => string }} [options]
 * @returns {string}
 */
function resolveContentLastmod({
  repoRoot = path.join(__dirname, '..', '..', '..'),
  exec = execSync,
  now = () => new Date(),
  readManifest = () => fs.readFileSync(path.join(repoRoot, MANIFEST_PATH), 'utf-8'),
} = {}) {
  const gitDate =
    lastCommitDate(`-- ${CONTENT_PATHS.join(' ')}`, repoRoot, exec) ||
    lastCommitDate('', repoRoot, exec);
  const contentDate = latestManifestDate(readManifest);
  const latest = [gitDate, contentDate].filter(Boolean).sort().pop();
  return latest || now().toISOString().slice(0, 10);
}

module.exports = { CONTENT_PATHS, resolveContentLastmod };

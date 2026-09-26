const { execSync } = require('child_process');
const path = require('path');

const CONTENT_PATHS = [
  'packages/data/resumes/master',
  'apps/portfolio/index.html',
  'apps/portfolio/index-en.html',
  'apps/portfolio/src',
  'apps/portfolio/lib',
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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
 * Sitemap `<lastmod>` / `Last-Modified` date (YYYY-MM-DD): the last commit that
 * touched rendered content, else the HEAD commit (shallow CI clones keep no
 * older history), else the build day when git is unavailable.
 * @param {{ repoRoot?: string, exec?: ExecFn, now?: () => Date }} [options]
 * @returns {string}
 */
function resolveContentLastmod({
  repoRoot = path.join(__dirname, '..', '..', '..'),
  exec = execSync,
  now = () => new Date(),
} = {}) {
  return (
    lastCommitDate(`-- ${CONTENT_PATHS.join(' ')}`, repoRoot, exec) ||
    lastCommitDate('', repoRoot, exec) ||
    now().toISOString().slice(0, 10)
  );
}

module.exports = { CONTENT_PATHS, resolveContentLastmod };

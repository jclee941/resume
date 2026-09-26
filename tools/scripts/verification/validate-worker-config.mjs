import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWorkerConfiguration } from './validate-worker-rules.mjs';

export { validateWorkerConfiguration };

const SCANNED_EXTENSIONS = new Set('.cjs .go .js .json .mjs .sh .ts .tsx .yaml .yml'.split(' '));
const IGNORED_DIRECTORIES = new Set(['.git', '.tmp', 'node_modules', 'third_party', '.worktrees']);

/**
 * @typedef {Object} ScannedFile
 * @property {string} path
 * @property {string} content
 */

/**
 * @param {ScannedFile[]} consumers
 * @returns {void}
 */
export function validateWorkerConsumers(consumers) {
  const childPaths = [
    ['apps', 'portfolio', 'wrangler.jsonc'].join('/'),
    ['apps', 'job-dashboard', 'wrangler.jsonc'].join('/'),
  ];
  const failures = [];
  for (const { path: consumerPath, content } of consumers) {
    if (childPaths.some((childPath) => content.includes(childPath))) {
      failures.push(`${consumerPath}: removed child Wrangler config`);
    }
    if (/wrangler[^\n]*--env(?:\s+|=)["']?production\b/u.test(content)) {
      failures.push(`${consumerPath}: production must omit --env`);
    }
  }
  assert.deepEqual(failures, [], failures.join('\n'));
}

/**
 * @param {string} target
 * @param {string} root
 * @param {ScannedFile[]} files
 * @returns {void}
 */
function collectFiles(target, root, files) {
  if (!existsSync(target)) return;
  const relative = path.relative(root, target);
  const segments = relative.split(path.sep);
  if (segments.some((segment) => IGNORED_DIRECTORIES.has(segment) || segment === '__tests__')) {
    return;
  }
  if (statSync(target).isDirectory()) {
    for (const entry of readdirSync(target)) collectFiles(path.join(target, entry), root, files);
    return;
  }
  if (SCANNED_EXTENSIONS.has(path.extname(target))) {
    files.push({ path: relative, content: readFileSync(target, 'utf8') });
  }
}

/**
 * @param {string} target
 * @param {string} root
 * @param {string[]} configs
 * @returns {void}
 */
function collectWranglerConfigs(target, root, configs) {
  if (!existsSync(target)) return;
  const relative = path.relative(root, target);
  const segments = relative.split(path.sep);
  if (segments.some((segment) => IGNORED_DIRECTORIES.has(segment))) return;
  if (statSync(target).isDirectory()) {
    for (const entry of readdirSync(target)) {
      collectWranglerConfigs(path.join(target, entry), root, configs);
    }
    return;
  }
  if (['wrangler.jsonc', 'wrangler.toml'].includes(path.basename(target))) configs.push(relative);
}

/**
 * @param {string} repositoryRoot
 * @returns {Record<string, unknown>}
 */
export function validateWorkerRepository(repositoryRoot) {
  const rootConfig = path.join(repositoryRoot, 'wrangler.jsonc');
  /** @type {string[]} */
  const configs = [];
  collectWranglerConfigs(repositoryRoot, repositoryRoot, configs);
  assert.deepEqual(
    configs.sort(),
    ['wrangler.jsonc'],
    'root wrangler.jsonc must be the only config'
  );
  const inventory = validateWorkerConfiguration(readFileSync(rootConfig, 'utf8'));
  /** @type {ScannedFile[]} */
  const files = [];
  for (const target of [
    'package.json',
    'playwright.config.js',
    'packages/cli',
    'tools/ci',
    'tools/scripts',
    '.github/workflows',
  ]) {
    collectFiles(path.join(repositoryRoot, target), repositoryRoot, files);
  }
  for (const workspaceRoot of ['apps', 'packages']) {
    const absoluteRoot = path.join(repositoryRoot, workspaceRoot);
    for (const workspace of readdirSync(absoluteRoot)) {
      collectFiles(path.join(absoluteRoot, workspace, 'package.json'), repositoryRoot, files);
    }
  }
  validateWorkerConsumers(files);
  return inventory;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const inventory = validateWorkerRepository(repositoryRoot);
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
}

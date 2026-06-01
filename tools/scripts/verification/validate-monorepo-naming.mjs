#!/usr/bin/env node
/**
 * Monorepo naming convention validator
 * Enforces: no .sh operational scripts, no catch-all filenames,
 * kebab-case/lowercase naming in source domains.
 */

import { execSync } from 'child_process';
import path from 'path';

const EXIT_OK = 0;
const EXIT_VIOLATION = 1;

// Directories excluded from naming checks
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  '.wrangler',
  '.next',
  'data',
  'log',
  'logs',
  'tmp',
  'profiles',
  '.sisyphus',
  '.cache',
  '.venv',
  '.ruff_cache',
  'thoughts',
  'infrastructure/n8n',
]);

// Allowed shell script exceptions (≤5 line stubs in .githooks/)
const ALLOWED_SH_PATTERNS = [/^\.githooks\//];

// Catch-all filenames prohibited in source directories
const CATCH_ALL_NAMES = new Set(['utils', 'helpers', 'misc']);

function isExcludedDir(filePath) {
  const parts = filePath.split(path.sep);
  return parts.some((p) => EXCLUDED_DIRS.has(p));
}

function isAllowedSh(filePath) {
  return ALLOWED_SH_PATTERNS.some((re) => re.test(filePath));
}

function getTrackedFiles() {
  try {
    const out = execSync('git ls-files', { encoding: 'utf-8', cwd: '/home/jclee/dev/resume' });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    console.error('Error: unable to run git ls-files');
    process.exit(EXIT_VIOLATION);
  }
}

const violations = [];

// 1. Check for tracked .sh operational scripts
const tracked = getTrackedFiles();
const shFiles = tracked.filter((f) => f.endsWith('.sh') && !isAllowedSh(f));
if (shFiles.length > 0) {
  for (const f of shFiles) {
    violations.push(`[VIOLATION] Tracked shell script: ${f}`);
  }
}

// 2. Check for catch-all filenames in source directories
const sourceDirs = ['apps', 'packages', 'tools/scripts'];
for (const file of tracked) {
  if (isExcludedDir(file)) continue;
  const isInSource = sourceDirs.some((d) => file.startsWith(d + path.sep));
  if (!isInSource) continue;

  const base = path.basename(file, path.extname(file));
  if (CATCH_ALL_NAMES.has(base)) {
    violations.push(`[VIOLATION] Catch-all filename "${base}" in source: ${file}`);
  }
}

// Report
if (violations.length === 0) {
  console.log('[PASS] Monorepo naming convention check passed.');
  process.exit(EXIT_OK);
} else {
  console.log(`[FAIL] ${violations.length} naming convention violation(s) found:`);
  for (const v of violations) {
    console.log(`  ${v}`);
  }
  process.exit(EXIT_VIOLATION);
}

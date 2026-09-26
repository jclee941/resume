#!/usr/bin/env node
/**
 * check-agents-coverage.js
 *
 * Validates that hotspot files (high complexity/risk) have AGENTS.md coverage.
 * Hotspots are identified by:
 * - LOC > threshold (default 500)
 * - Risk domains: deploy, auth, secrets, infra, CI
 *
 * Usage: node scripts/verification/check-agents-coverage.js [--threshold=500] [--verbose]
 */

const { execSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const { dirname, join, relative } = require('path');

const args = process.argv.slice(2);
const THRESHOLD = parseInt(args.find((a) => a.startsWith('--threshold='))?.split('=')[1] || '500');
const VERBOSE = args.includes('--verbose');

const ROOT = process.cwd();

const RISK_PATTERNS = [
  /wrangler\.toml$/,
  /\.gitlab-ci\.yml$/,
  /\.github\/workflows\//,
  /Makefile$/,
  /deploy/i,
  /auth/i,
  /secret/i,
  /credential/i,
  /\.env\./,
  /cookie/i,
];

const CODE_EXTENSIONS = ['.js', '.ts', '.tsx', '.go', '.py', '.rs'];
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', '.venv', 'vendor'];

/**
 * @param {string} filePath
 * @returns {number}
 */
function countLines(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isRiskFile(filePath) {
  return RISK_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * @param {string} filePath
 * @returns {string | null}
 */
function findNearestAgentsMd(filePath) {
  let dir = dirname(filePath);
  while (dir.length >= ROOT.length) {
    const agentsPath = join(dir, 'AGENTS.md');
    if (existsSync(agentsPath)) {
      return relative(ROOT, agentsPath) || 'AGENTS.md';
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function getAllFiles(dir) {
  try {
    const entries = execSync(
      `find "${dir}" -type f \\( -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.go" -o -name "*.py" -o -name "*.rs" -o -name "*.toml" -o -name "*.yml" -o -name "Makefile" \\) 2>/dev/null`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    )
      .split('\n')
      .filter(Boolean);
    return entries.filter((f) => !SKIP_DIRS.some((skip) => f.includes(`/${skip}/`)));
  } catch {
    return [];
  }
}

function main() {
  console.log('=== AGENTS.md Coverage Check ===\n');
  console.log(`LOC threshold: ${THRESHOLD}`);
  console.log(`Risk patterns: ${RISK_PATTERNS.length}\n`);

  const allFiles = getAllFiles(ROOT);
  const hotspots = [];
  const uncovered = [];

  for (const file of allFiles) {
    const relPath = relative(ROOT, file);
    const ext = file.substring(file.lastIndexOf('.'));

    let isHotspot = false;
    let reason = '';

    if (CODE_EXTENSIONS.includes(ext)) {
      const lines = countLines(file);
      if (lines > THRESHOLD) {
        isHotspot = true;
        reason = `${lines} LOC`;
      }
    }

    if (isRiskFile(relPath)) {
      isHotspot = true;
      reason = reason ? `${reason}, risk domain` : 'risk domain';
    }

    if (isHotspot) {
      const nearestAgents = findNearestAgentsMd(file);
      hotspots.push({ path: relPath, reason, agentsMd: nearestAgents });

      if (!nearestAgents) {
        uncovered.push({ path: relPath, reason });
      }
    }
  }

  console.log(`Found ${hotspots.length} hotspot files:\n`);

  if (VERBOSE) {
    console.log('| File | Reason | Covered By |');
    console.log('|------|--------|------------|');
    for (const h of hotspots.sort((a, b) => a.path.localeCompare(b.path))) {
      const covered = h.agentsMd || '❌ NONE';
      console.log(`| ${h.path} | ${h.reason} | ${covered} |`);
    }
    console.log('');
  }

  /** @type {Record<string, string[]>} */
  const byScope = {};
  for (const h of hotspots) {
    const scope = h.agentsMd || '(uncovered)';
    byScope[scope] = byScope[scope] || [];
    byScope[scope].push(h.path);
  }

  console.log('Coverage by AGENTS.md scope:');
  for (const [scope, files] of Object.entries(byScope).sort()) {
    const icon = scope === '(uncovered)' ? '❌' : '✓';
    console.log(`  ${icon} ${scope}: ${files.length} hotspots`);
  }

  console.log('');

  if (uncovered.length > 0) {
    console.log(`❌ ${uncovered.length} hotspot file(s) without AGENTS.md coverage:\n`);
    for (const u of uncovered) {
      console.log(`  - ${u.path} (${u.reason})`);
    }
    console.log('\nRecommendation: Add AGENTS.md to ancestor directories of uncovered files.\n');
    process.exit(1);
  } else {
    console.log('✅ All hotspot files have AGENTS.md coverage.\n');
    process.exit(0);
  }
}

main();

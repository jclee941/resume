#!/usr/bin/env node

/**
 * Version bumping script for resume portfolio
 * Automatically increments patch version on each deployment
 *
 * Usage:
 *   node scripts/utils/bump-version.js [major|minor|patch]
 *   Default: patch (1.0.0 -> 1.0.1)
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_JSON_PATH = path.join(__dirname, '../../package.json');

/**
 * Parse semantic version string
 * @param {string} version - Semantic version (e.g., "1.0.0")
 * @returns {{major: number, minor: number, patch: number}}
 */
function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return {major, minor, patch};
}

/**
 * Increment version based on type
 * @param {string} currentVersion - Current semantic version
 * @param {string} type - Increment type: 'major', 'minor', or 'patch'
 * @returns {string} New semantic version
 */
function incrementVersion(currentVersion, type = 'patch') {
  const {major, minor, patch} = parseVersion(currentVersion);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Main execution
 */
function main() {
  const incrementType = process.argv[2] || 'patch';

  if (!['major', 'minor', 'patch'].includes(incrementType)) {
    console.error(`❌ Invalid increment type: ${incrementType}`);
    console.error('Valid types: major, minor, patch');
    process.exit(1);
  }

  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  const currentVersion = packageJson.version;

  // Calculate new version
  const newVersion = incrementVersion(currentVersion, incrementType);

  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(
    PACKAGE_JSON_PATH,
    `${JSON.stringify(packageJson, null, 2)  }\n`
  );

  console.log(
    `✓ Version bumped: ${currentVersion} → ${newVersion} (${incrementType})`
  );
  console.log('✓ Updated: package.json');
}

// Run only if executed directly (not imported)
if (require.main === module) {
  main();
}

module.exports = {incrementVersion, parseVersion};

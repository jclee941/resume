#!/usr/bin/env node
/**
 * Go Scripts Validation Test
 * Validates that Go deployment scripts compile and have proper structure
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[✓]${colors.reset}`,
    error: `${colors.red}[✗]${colors.reset}`,
    warning: `${colors.yellow}[!]${colors.reset}`,
  }[type];
  console.log(`${prefix} ${message}`);
}

const goScripts = [
  'setup-gitlab-oauth.go',
  'deployment/register-gitlab-runner.go',
  'deployment/gitlab/main.go',
  'verification/test-gitlab-cicd-integration.go',
];

function checkGoScript(scriptPath) {
  const fullPath = join(scriptsDir, scriptPath);

  log(`Checking ${scriptPath}...`);

  // Check file exists
  if (!existsSync(fullPath)) {
    log(`File not found: ${scriptPath}`, 'error');
    return false;
  }

  // Check it compiles
  try {
    execSync(`go build -o /dev/null ${fullPath}`, { stdio: 'pipe' });
    log('  Compiles successfully', 'success');
  } catch (error) {
    log('  Compilation failed', 'error');
    return false;
  }

  // Check content for security issues
  const content = readFileSync(fullPath, 'utf8');

  // Check for secret printing (should be redacted)
  if (content.includes('fmt.Printf') && content.includes('secret')) {
    // Make sure it's redacted
    if (!content.includes('[REDACTED') && !content.includes('***')) {
      log('  Warning: May print secrets without redaction', 'warning');
    }
  }

  // Check for proper error handling
  if (!content.includes('os.Exit(')) {
    log('  Warning: No error exit points found', 'warning');
  }

  return true;
}

function checkNoShellScripts() {
  log('Checking for leftover shell scripts...');

  const shellScripts = ['setup-gitlab-oauth.sh', 'deployment/register-gitlab-runner.sh'];

  let found = false;
  for (const script of shellScripts) {
    const fullPath = join(scriptsDir, script);
    if (existsSync(fullPath)) {
      log(`  Found shell script: ${script}`, 'error');
      found = true;
    }
  }

  if (!found) {
    log('  No shell scripts found (all migrated to Go)', 'success');
    return true;
  }

  return false;
}

function main() {
  console.log(`${colors.blue}============================================${colors.reset}`);
  console.log(`${colors.blue}  Go Scripts Validation Tests${colors.reset}`);
  console.log(`${colors.blue}============================================${colors.reset}\n`);

  let allPassed = true;

  // Check shell scripts removed
  if (!checkNoShellScripts()) {
    allPassed = false;
  }

  console.log();

  // Check each Go script
  for (const script of goScripts) {
    if (!checkGoScript(script)) {
      allPassed = false;
    }
  }

  console.log();
  console.log(`${colors.blue}============================================${colors.reset}`);
  console.log(`${colors.blue}  Summary${colors.reset}`);
  console.log(`${colors.blue}============================================${colors.reset}\n`);

  if (allPassed) {
    console.log(`${colors.green}✓ All Go scripts validation passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ Some validation checks failed.${colors.reset}\n`);
    process.exit(1);
  }
}

main();

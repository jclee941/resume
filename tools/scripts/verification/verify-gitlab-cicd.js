#!/usr/bin/env node
/**
 * GitLab CI/CD Deployment Verification Script
 * Tests OAuth, Runner, and Pipeline configuration
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const GITLAB_URL = process.env.GITLAB_URL || 'http://gitlab.jclee.me';
const GITLAB_OAUTH_APP_ID = process.env.GITLAB_OAUTH_APP_ID;
const GITLAB_OAUTH_CLIENT_SECRET = process.env.GITLAB_OAUTH_CLIENT_SECRET;

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

async function checkGitLabAccessibility() {
  log('Checking GitLab accessibility...');
  try {
    const response = await fetch(`${GITLAB_URL}/api/v4/version`);
    if (response.ok) {
      const data = await response.json();
      log(`GitLab ${data.version} is accessible`, 'success');
      return true;
    }
  } catch (error) {
    log(`Cannot reach GitLab at ${GITLAB_URL}`, 'error');
    log(`Error: ${error.message}`, 'error');
  }
  return false;
}

async function checkOAuthToken() {
  log('Checking OAuth token fetch...');

  if (!GITLAB_OAUTH_APP_ID || !GITLAB_OAUTH_CLIENT_SECRET) {
    log('GITLAB_OAUTH_APP_ID or GITLAB_OAUTH_CLIENT_SECRET not set', 'warning');
    log('Skipping OAuth test', 'warning');
    return null;
  }

  try {
    const response = await fetch(`${GITLAB_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: GITLAB_OAUTH_APP_ID,
        client_secret: GITLAB_OAUTH_CLIENT_SECRET,
        scope: 'api',
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      log(`OAuth token obtained successfully (expires in ${data.expires_in}s)`, 'success');
      return data.access_token;
    } else {
      log(`OAuth failed: ${data.error || 'Unknown error'}`, 'error');
      return null;
    }
  } catch (error) {
    log(`OAuth request failed: ${error.message}`, 'error');
    return null;
  }
}

async function checkGitLabRunner() {
  log('Checking GitLab Runner...');

  try {
    // Check if docker container exists
    const output = execSync('docker ps --filter "name=gitlab-runner" --format "{{.Names}}"', {
      encoding: 'utf8',
    });

    if (output.includes('gitlab-runner')) {
      log('GitLab Runner container is running', 'success');

      // Check runner logs
      const logs = execSync('docker logs gitlab-runner --tail 20 2>&1', { encoding: 'utf8' });

      if (logs.includes('online') || logs.includes('Verifying runner')) {
        log('Runner is online and operational', 'success');
        return true;
      } else {
        log('Runner container exists but may not be fully operational', 'warning');
        return false;
      }
    } else {
      log('GitLab Runner container not found', 'error');
      log(
        'Run: docker run -d --name gitlab-runner -v /var/run/docker.sock:/var/run/docker.sock gitlab/gitlab-runner:latest',
        'info'
      );
      return false;
    }
  } catch (error) {
    log(`Cannot check runner: ${error.message}`, 'error');
    return false;
  }
}

async function checkCICDConfig() {
  log('Checking CI/CD configuration...');

  try {
    const config = readFileSync('.gitlab-ci.yml', 'utf8');

    const checks = [
      { name: 'Stages defined', test: () => config.includes('stages:') },
      { name: 'Validate stage', test: () => config.includes('stage: validate') },
      { name: 'Build stage', test: () => config.includes('stage: build') },
      { name: 'Test stage', test: () => config.includes('stage: test') },
      { name: 'Deploy stage', test: () => config.includes('stage: deploy') },
      { name: 'OAuth token fetch job', test: () => config.includes('fetch-oauth-token') },
      { name: 'OAuth token usage job', test: () => config.includes('oauth-automation-demo') },
      { name: 'Docker tag', test: () => config.includes('tags:') && config.includes('- docker') },
    ];

    let passed = 0;
    for (const check of checks) {
      if (check.test()) {
        log(`  ${check.name}: OK`, 'success');
        passed++;
      } else {
        log(`  ${check.name}: MISSING`, 'error');
      }
    }

    log(
      `CI/CD config: ${passed}/${checks.length} checks passed`,
      passed === checks.length ? 'success' : 'warning'
    );
    return passed === checks.length;
  } catch (error) {
    log(`Cannot read .gitlab-ci.yml: ${error.message}`, 'error');
    return false;
  }
}

async function checkEnvironmentVariables() {
  log('Checking environment variables...');

  const vars = ['GITLAB_URL', 'GITLAB_OAUTH_APP_ID', 'GITLAB_OAUTH_CLIENT_SECRET'];

  let allSet = true;
  for (const v of vars) {
    if (process.env[v]) {
      log(`  ${v}: Set`, 'success');
    } else {
      log(`  ${v}: Not set`, 'warning');
      allSet = false;
    }
  }

  return allSet;
}

async function main() {
  console.log(`${colors.blue}============================================${colors.reset}`);
  console.log(`${colors.blue}  GitLab CI/CD Deployment Verification${colors.reset}`);
  console.log(`${colors.blue}============================================${colors.reset}\n`);

  const results = {
    gitlab: await checkGitLabAccessibility(),
    oauth: await checkOAuthToken(),
    runner: await checkGitLabRunner(),
    config: await checkCICDConfig(),
    env: await checkEnvironmentVariables(),
  };

  console.log(`\n${colors.blue}============================================${colors.reset}`);
  console.log(`${colors.blue}  Summary${colors.reset}`);
  console.log(`${colors.blue}============================================${colors.reset}`);

  const allPassed = Object.values(results).every((r) => r === true);

  if (allPassed) {
    console.log(`\n${colors.green}✓ All checks passed! Ready for deployment.${colors.reset}\n`);
    console.log('Next steps:');
    console.log('  1. Push .gitlab-ci.yml to GitLab');
    console.log('  2. Go to: http://gitlab.jclee.me/qws941/resume/-/pipelines');
    console.log('  3. Trigger a new pipeline');
    process.exit(0);
  } else {
    console.log(`\n${colors.yellow}! Some checks failed. Review errors above.${colors.reset}\n`);
    console.log('Troubleshooting guide: docs/guides/GITLAB_DEPLOYMENT_TROUBLESHOOTING.md');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});

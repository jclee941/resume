/**
 * GitLab CI/CD pipeline configuration checks
 */

import { readFileSync } from 'fs';
import { log } from './utils.js';

/**
 * Check .gitlab-ci.yml configuration
 * @returns {Promise<boolean>} true if all checks pass
 */
export async function checkCICDConfig() {
  log('Checking CI/CD configuration...');

  try {
    const config = readFileSync('.gitlab-ci.yml', 'utf8');

    const checks = [
      { name: 'Stages defined', test: () => config.includes('stages:') },
      { name: 'Analyze stage', test: () => config.includes('analyze') },
      { name: 'Validate stage', test: () => config.includes('validate') },
      { name: 'Build stage', test: () => config.includes('build') },
      { name: 'Test stage', test: () => config.includes('test') },
      { name: 'Deploy stage', test: () => config.includes('deploy') },
      { name: 'Verify stage', test: () => config.includes('verify') },
      { name: 'Includes jobs', test: () => config.includes('include:') && config.includes('.gitlab/ci/jobs/') },
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

/**
 * Check required environment variables
 * @returns {Promise<boolean>} true if all required vars are set
 */
export async function checkEnvironmentVariables() {
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

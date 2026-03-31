#!/usr/bin/env node
/**
 * GitLab CI/CD Deployment Verification Script
 * Orchestrates all GitLab-related checks
 */

import { checkGitLabAccessibility } from './gitlab-api.js';
import { checkOAuthToken } from './oauth.js';
import { checkGitLabRunner } from './runner.js';
import { checkCICDConfig, checkEnvironmentVariables } from './pipeline.js';
import { colors } from './utils.js';

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

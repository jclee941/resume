/**
 * GitLab Runner status checks
 */

import { execSync } from 'child_process';
import { log } from './utils.js';

/**
 * Check if GitLab Runner Docker container is running
 * @returns {Promise<boolean>} true if runner is operational
 */
export async function checkGitLabRunner() {
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

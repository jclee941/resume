/**
 * GitLab API accessibility checks
 */

import { log } from './utils.js';

const GITLAB_URL = process.env.GITLAB_URL || 'http://gitlab.jclee.me';

/**
 * Check if GitLab instance is reachable via API
 * @returns {Promise<boolean>} true if accessible
 */
export async function checkGitLabAccessibility() {
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

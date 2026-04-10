/**
 * GitLab OAuth token checks
 */

import { log } from './utils.js';

const GITLAB_URL = process.env.GITLAB_URL || 'http://gitlab.jclee.me';
const GITLAB_OAUTH_APP_ID = process.env.GITLAB_OAUTH_APP_ID;
const GITLAB_OAUTH_CLIENT_SECRET = process.env.GITLAB_OAUTH_CLIENT_SECRET;

/**
 * Check OAuth token fetch from GitLab
 * @returns {Promise<string|null>} access token or null
 */
export async function checkOAuthToken() {
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

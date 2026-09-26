import { WantedAPI } from '@resume/shared/clients/wanted';
import { LinkedInClient } from '../../services/linkedin-client.js';
import { RememberClient } from '../../services/remember-client.js';
import { CliproxyClient } from '../../services/cliproxy-client.js';

/**
 * @param {import('../../services/cliproxy-client.js').CliproxyEnv & Record<string, unknown>} [env]
 * @returns {{
 *   wanted: WantedAPI;
 *   linkedin: LinkedInClient;
 *   remember: RememberClient;
 *   cliproxy: CliproxyClient;
 * }}
 */
export function createAutoApplyClients(env) {
  return {
    wanted: new WantedAPI(),
    linkedin: new LinkedInClient(env),
    remember: new RememberClient(env),
    cliproxy: new CliproxyClient(env),
  };
}

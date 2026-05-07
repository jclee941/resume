import { WantedAPI } from '@resume/shared/clients/wanted';
import { LinkedInClient } from '../../services/linkedin-client.js';
import { RememberClient } from '../../services/remember-client.js';

export function createAutoApplyClients(env) {
  return {
    wanted: new WantedAPI(),
    linkedin: new LinkedInClient(env),
    remember: new RememberClient(env),
  };
}

import { WantedClient } from '@resume/shared/wanted-client';
import { LinkedInClient } from '../../services/linkedin-client.js';
import { RememberClient } from '../../services/remember-client.js';

export function createAutoApplyClients(env) {
  return {
    wanted: new WantedClient(),
    linkedin: new LinkedInClient(env),
    remember: new RememberClient(env),
  };
}

import { createAutoApplyClients } from './client-factory.js';
import { jsonResponse } from './response.js';
import { runAutoApply } from './run-handler.js';
import { getAutoApplyStatus } from './status-handler.js';
import { configureAutoApply } from './config-handler.js';

export class AutoApplyHandler {
  constructor(env) {
    this.env = env;
    this.db = env.JOB_DB;
    this.sessions = env.SESSIONS;
    this.clients = createAutoApplyClients(env);
  }

  jsonResponse(data, status = 200) {
    return jsonResponse(data, status);
  }

  async run(request) {
    return runAutoApply({ request, env: this.env, clients: this.clients });
  }

  async status(_request) {
    return getAutoApplyStatus(this.env);
  }

  async configure(request) {
    return configureAutoApply({ request, env: this.env, db: this.db });
  }
}

export default AutoApplyHandler;

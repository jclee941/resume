import { createAutoApplyClients } from './client-factory.js';
import { jsonResponse } from '../../middleware/cors.js';
import { runAutoApply } from './run-handler.js';
import { getAutoApplyStatus } from './status-handler.js';
import { configureAutoApply } from './config-handler.js';
import { startAutoApply } from './start-handler.js';

/**
 * Every auto-apply entry point receives the same Worker env.
 * @typedef {import('./run-handler.js').AutoApplyRunEnv
 *   & Parameters<typeof getAutoApplyStatus>[0]
 *   & import('./start-handler.js').AutoApplyStartHandlerEnv
 *   & { JOB_DB?: import('./config-handler.js').ConfigDb }} AutoApplyHandlerEnv
 */

export class AutoApplyHandler {
  /**
   * @param {AutoApplyHandlerEnv} env
   */
  constructor(env) {
    this.env = env;
    this.db = env.JOB_DB;
    this.sessions = env.SESSIONS;
    this.clients = createAutoApplyClients(env);
  }

  /**
   * @param {unknown} data
   * @param {number} [status]
   * @returns {Response}
   */
  jsonResponse(data, status = 200) {
    return jsonResponse(data, status);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async run(request) {
    return runAutoApply({ request, env: this.env, clients: this.clients });
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async start(request) {
    return startAutoApply({ request, env: this.env });
  }

  /**
   * @param {Request} _request
   * @returns {Promise<Response>}
   */
  async status(_request) {
    return getAutoApplyStatus(this.env);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async configure(request) {
    return configureAutoApply({ request, env: this.env, db: this.db });
  }
}

export default AutoApplyHandler;

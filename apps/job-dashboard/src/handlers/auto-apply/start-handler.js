import { getConfig } from './db-helpers.js';
import { jsonResponse } from '../../middleware/cors.js';
import { buildAutoApplyParams, isCronSwitchOff } from '../scheduled/auto-apply-start.js';

/**
 * @typedef {import('../scheduled/auto-apply-start.js').AutoApplyStartEnv & {
 *   APPLICATION_WORKFLOW?: { create(options: { params: unknown }): Promise<{ id: string }> };
 * }} AutoApplyStartHandlerEnv
 */

/**
 * @param {Request} request
 * @returns {Promise<boolean | null>} dryRun, or null when the body is invalid
 */
async function readDryRun(request) {
  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dryRun ?? true;
  return typeof dryRun === 'boolean' ? dryRun : null;
}

/**
 * Start the cron's ApplicationWorkflow run from the dashboard. A dry run is allowed while
 * auto-apply is disabled (it makes no network writes); a live run is not.
 * @param {{ request: Request; env: AutoApplyStartHandlerEnv }} options
 * @returns {Promise<Response>}
 */
export async function startAutoApply({ request, env }) {
  const dryRun = await readDryRun(request);
  if (dryRun === null)
    return jsonResponse({ success: false, error: 'dryRun must be a boolean' }, 400);

  if (!env.JOB_DB) return jsonResponse({ success: false, error: 'Database not configured' }, 503);
  /** @type {import('./db-helpers.js').AutoApplyConfig} */
  let config;
  try {
    config = await getConfig(env);
  } catch {
    return jsonResponse({ success: false, error: 'auto-apply config unavailable' }, 503);
  }

  if (!dryRun && (isCronSwitchOff(env) || !config.autoApplyEnabled)) {
    return jsonResponse({ success: false, error: 'auto-apply is disabled' }, 409);
  }
  if (!env.APPLICATION_WORKFLOW) {
    return jsonResponse({ success: false, error: 'APPLICATION_WORKFLOW binding is missing' }, 503);
  }

  const params = buildAutoApplyParams(config, {
    triggerType: 'dashboard-auto-apply',
    source: 'dashboard',
    dryRun,
  });
  const instance = await env.APPLICATION_WORKFLOW.create({ params });
  return jsonResponse({ success: true, instanceId: instance.id, dryRun }, 202);
}

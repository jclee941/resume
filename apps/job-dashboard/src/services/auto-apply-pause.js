export const AUTO_APPLY_PAUSED_KEY = 'config:auto-apply:paused';

/**
 * @typedef {{
 *   SESSIONS: {
 *     get(key: string): Promise<string | null>;
 *   };
 * }} AutoApplyPauseEnv
 */

/**
 * @param {AutoApplyPauseEnv} env
 * @returns {Promise<boolean>}
 */
export async function isAutoApplyPaused(env) {
  return (await env.SESSIONS.get(AUTO_APPLY_PAUSED_KEY)) === 'true';
}

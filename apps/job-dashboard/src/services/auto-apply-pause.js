export const AUTO_APPLY_PAUSED_KEY = 'config:auto-apply:paused';

export async function isAutoApplyPaused(env) {
  return (await env.SESSIONS.get(AUTO_APPLY_PAUSED_KEY)) === 'true';
}

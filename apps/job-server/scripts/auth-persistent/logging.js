/**
 * @param {string} msg
 * @param {'info' | 'success' | 'warn' | 'error' | string} [type='info']
 * @param {string | null} [platform=null]
 * @returns {void}
 */
export function log(msg, type = 'info', platform = null) {
  const prefix = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' }[type] || '📝';
  const tag = platform ? `[${platform.toUpperCase()}]` : '';
  console.log(`${new Date().toISOString()} ${prefix} ${tag} ${msg}`);
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

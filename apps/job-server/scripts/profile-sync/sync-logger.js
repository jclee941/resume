/**
 * @param {string} msg
 * @param {'info'|'success'|'warn'|'error'|'diff'} [type]
 * @param {string|null} [platform]
 * @returns {void}
 */
export function log(msg, type = 'info', platform = null) {
  const prefix =
    { info: 'INFO', success: 'OK', warn: 'WARN', error: 'ERR', diff: 'DIFF' }[type] || 'LOG';
  const tag = platform ? `[${platform.toUpperCase()}]` : '';
  console.log(`${new Date().toISOString()} [${prefix}] ${tag} ${msg}`);
}

import fs from 'fs';
import { CONFIG } from './config.js';

/**
 * @param {string} msg
 * @param {'info' | 'success' | 'warn' | 'error' | 'diff' | string} [type='info']
 * @param {string | null} [platform=null]
 */
export function log(msg, type = 'info', platform = null) {
  const prefix =
    { info: 'INFO', success: 'OK', warn: 'WARN', error: 'ERR', diff: 'DIFF' }[type] || 'LOG';
  const tag = platform ? `[${platform.toUpperCase()}]` : '';
  console.log(`${new Date().toISOString()} [${prefix}] ${tag} ${msg}`);
}

export function loadSSOT() {
  if (!fs.existsSync(CONFIG.SSOT_PATH)) {
    throw new Error(`SSOT not found: ${CONFIG.SSOT_PATH}`);
  }
  const data = JSON.parse(fs.readFileSync(CONFIG.SSOT_PATH, 'utf-8'));
  log(`Loaded SSOT: ${data.personal.name}`, 'success');
  return data;
}

/**
 * @param {Record<string, string>} current
 * @param {Record<string, string>} target
 * @returns {Array<{field: string, from: string, to: string}>}
 */
export function computeDiff(current, target) {
  const changes = [];
  for (const [key, targetValue] of Object.entries(target)) {
    const currentValue = current[key];
    if (currentValue !== targetValue) {
      changes.push({
        field: key,
        from: currentValue || '(empty)',
        to: targetValue,
      });
    }
  }
  return changes;
}

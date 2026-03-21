import fs from 'fs';
import { CONFIG } from './constants.js';

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

/**
 * @returns {Object}
 */
export function loadSSOT() {
  if (!fs.existsSync(CONFIG.SSOT_PATH)) {
    throw new Error(`SSOT not found: ${CONFIG.SSOT_PATH}`);
  }
  const data = JSON.parse(fs.readFileSync(CONFIG.SSOT_PATH, 'utf-8'));
  log(`Loaded SSOT: ${data.personal.name}`, 'success');
  return data;
}

export { toE164, normalizePhone, toKoreanPhone as _toKoreanPhone } from '@resume/shared/phone';

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

/**
 * @param {string} period - e.g. "2024.03 ~ 현재" or "2014.12 - 2016.12"
 * @returns {{startsAt: string, endsAt: string|null}}
 */
export function parsePeriod(period) {
  if (typeof period !== 'string' || !period.trim()) {
    return { startsAt: '', endsAt: null };
  }
  const sep = period.includes('~') ? '~' : ' - ';
  const parts = period.split(sep).map((p) => p.trim());
  const startsAt = `${parts[0].replace('.', '-')}-01`;
  let endsAt = null;
  if (parts[1] && parts[1] !== '현재') {
    endsAt = `${parts[1].replace('.', '-')}-01`;
  }
  return { startsAt, endsAt };
}

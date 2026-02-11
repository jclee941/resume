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

/**
 * @param {string} phone
 * @returns {string}
 */
export function toE164(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '+82' + digits.slice(1);
  }
  if (digits.startsWith('82')) {
    return '+' + digits;
  }
  return phone;
}

/**
 * @param {string} _phone
 * @returns {string}
 */
export function _toKoreanPhone(_phone) {
  if (!_phone) return '';
  const digits = _phone.replace(/^\+82/, '0').replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return digits;
}

/**
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhone(phone) {
  return toE164(phone);
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

/**
 * @param {string} period
 * @returns {{startsAt: string, endsAt: string|null}}
 */
export function parsePeriod(period) {
  const parts = period.split('~').map((p) => p.trim());
  const startsAt = parts[0].replace('.', '-') + '-01';
  let endsAt = null;
  if (parts[1] && parts[1] !== '현재') {
    endsAt = parts[1].replace('.', '-') + '-01';
  }
  return { startsAt, endsAt };
}

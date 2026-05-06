import fs from 'fs';
import { CONFIG } from './constants.js';

/**
 * @returns {Object}
 */
export function loadSSOT() {
  if (!fs.existsSync(CONFIG.SSOT_PATH)) {
    throw new Error(`SSOT not found: ${CONFIG.SSOT_PATH}`);
  }
  const data = JSON.parse(fs.readFileSync(CONFIG.SSOT_PATH, 'utf-8'));
  console.log(`${new Date().toISOString()} [OK] Loaded SSOT: ${data.personal.name}`);
  return data;
}

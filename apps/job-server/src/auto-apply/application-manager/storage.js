import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const DATA_DIR = join(homedir(), '.opencode', 'data', 'job-applications');
export const APPLICATIONS_FILE = join(DATA_DIR, 'applications.json');
export const STATS_FILE = join(DATA_DIR, 'stats.json');

export function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * @template T
 * @param {string} filePath
 * @param {() => T} fallback
 * @param {{ error: (message: string, error?: unknown) => void }} logger
 * @param {string} errorMessage
 * @returns {T}
 */
export function loadJsonFile(filePath, fallback, logger, errorMessage) {
  if (!existsSync(filePath)) {
    return fallback();
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (error) {
    logger.error(errorMessage, error);
    return fallback();
  }
}

/**
 * @param {import('./reports.js').ApplicationRecord[]} applications
 * @param {import('./reports.js').ApplicationStats} stats
 * @returns {void}
 */
export function saveApplicationData(applications, stats) {
  writeFileSync(APPLICATIONS_FILE, JSON.stringify(applications, null, 2));
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

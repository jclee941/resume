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

export function saveApplicationData(applications, stats) {
  writeFileSync(APPLICATIONS_FILE, JSON.stringify(applications, null, 2));
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

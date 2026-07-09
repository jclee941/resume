import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createFileSessionStore } from '@resume/shared/session';
import { getResumeBasePath } from '../../../utils/paths.js';
import { getSessionTtlMs } from '../session-constants.js';

const SHARED_DATA_DIR = getResumeBasePath();
export const SESSION_FILE = join(SHARED_DATA_DIR, 'sessions.json');

export function createStore(logger) {
  return createFileSessionStore({
    existsSync,
    readFileSync,
    writeFileSync,
    chmodSync,
    mkdirSync,
    filePath: SESSION_FILE,
    logger,
    getTtlMs: getSessionTtlMs,
  });
}

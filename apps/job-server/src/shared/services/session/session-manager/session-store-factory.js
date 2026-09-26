import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createFileSessionStore } from '@resume/shared/session';
import { getResumeBasePath } from '../../../utils/paths.js';
import { getSessionTtlMs } from '../session-constants.js';

const SHARED_DATA_DIR = getResumeBasePath();
export const SESSION_FILE = join(SHARED_DATA_DIR, 'sessions.json');

/**
 * @typedef {typeof createFileSessionStore & ((config: {
 *   existsSync: typeof existsSync;
 *   readFileSync: typeof readFileSync;
 *   writeFileSync: typeof writeFileSync;
 *   chmodSync: typeof chmodSync;
 *   mkdirSync: typeof mkdirSync;
 *   filePath: string;
 *   logger?: import('@resume/shared/session/store.js').SessionStoreLogger;
 *   getTtlMs?: typeof getSessionTtlMs;
 * }) => ReturnType<typeof createFileSessionStore>)} FileSessionStoreCreator
 */

/**
 * @param {import('@resume/shared/session/store.js').SessionStoreLogger} [logger]
 */
export function createStore(logger) {
  return /** @type {FileSessionStoreCreator} */ (createFileSessionStore)({
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

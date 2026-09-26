import { dirname as defaultDirname } from 'node:path';
import { getSessionTtlMs } from './constants.js';
import { normalizePlatformSession } from './normalization.js';

/**
 * @typedef {Object} SessionStoreLogger
 * @property {(...args: unknown[]) => void} error
 * @property {(...args: unknown[]) => void} [info]
 * @property {(...args: unknown[]) => void} [warn]
 * @property {(...args: unknown[]) => void} [debug]
 */

/**
 * @typedef {Object} FileSessionStoreConfig
 * @property {string} filePath
 * @property {(path: string) => boolean} existsSync
 * @property {(path: string, encoding: string) => string} readFileSync
 * @property {(path: string, contents: string, options?: { mode?: number }) => void} writeFileSync
 * @property {(path: string, options?: { recursive?: boolean }) => unknown} mkdirSync
 * @property {((path: string, mode: number) => void)} [chmodSync]
 * @property {((path: string) => string)} [dirname]
 * @property {SessionStoreLogger} [logger]
 * @property {((platform: string) => number)} [getTtlMs]
 * @property {number} [fileMode]
 */

/**
 * @param {import('./normalization.js').SessionData | null | undefined} session
 * @param {string} platform
 * @param {import('./normalization.js').NormalizeSessionOptions} [options]
 * @returns {boolean}
 */
export function isPlatformSessionValid(session, platform, options = {}) {
  const now = options.now ?? Date.now();
  const getTtlMs = options.getTtlMs || getSessionTtlMs;
  return !!(session && session.timestamp && now - session.timestamp < getTtlMs(platform));
}

/**
 * @param {Record<string, import('./normalization.js').SessionData & Record<string, unknown>>} [initial]
 * @param {import('./normalization.js').NormalizeSessionOptions} [options]
 */
export function createMemorySessionStore(initial = {}, options = {}) {
  const sessions = new Map(Object.entries(initial));
  return {
    /**
     * @param {string | null} [platform]
     */
    load(platform = null) {
      if (!platform) return Object.fromEntries(sessions);
      const session = sessions.get(platform);
      return isPlatformSessionValid(session, platform, options) ? session : null;
    },
    /**
     * @param {string} platform
     * @param {import('./normalization.js').SessionData & Record<string, unknown>} session
     */
    save(platform, session) {
      sessions.set(platform, normalizePlatformSession(platform, session, options));
      return true;
    },
    /**
     * @param {string | null} [platform]
     */
    clear(platform = null) {
      if (platform) sessions.delete(platform);
      else sessions.clear();
      return true;
    },
  };
}

/**
 * @param {FileSessionStoreConfig} config
 */
export function createFileSessionStore(config) {
  const { existsSync, readFileSync, writeFileSync, mkdirSync, filePath } = config;
  const dirname = config.dirname || defaultDirname;
  const logger = config.logger || console;
  const options = { getTtlMs: config.getTtlMs };
  const privateFileMode = config.fileMode ?? 0o600;

  function ensureDir() {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  /**
   * @param {string} contents
   */
  function writeSessionFile(contents) {
    writeFileSync(filePath, contents, { mode: privateFileMode });
    config.chmodSync?.(filePath, privateFileMode);
  }

  /**
   * @param {string | null} [platform]
   */
  function load(platform = null) {
    try {
      if (!existsSync(filePath)) return platform ? null : {};
      const allSessions = /** @type {Record<string, import('./normalization.js').SessionData>} */ (
        JSON.parse(readFileSync(filePath, 'utf-8'))
      );
      if (!platform) return allSessions;
      const session = allSessions[platform];
      return isPlatformSessionValid(session, platform, options) ? session : null;
    } catch (error) {
      logger.error(
        'Failed to load sessions:',
        error instanceof Error ? error.message : String(error)
      );
      return platform ? null : {};
    }
  }

  /**
   * @param {string} platform
   * @param {import('./normalization.js').SessionData & Record<string, unknown>} data
   * @returns {boolean}
   */
  function save(platform, data) {
    try {
      ensureDir();
      const allSessions =
        /** @type {Record<string, import('./normalization.js').SessionData & Record<string, unknown>>} */ (
          load() || {}
        );
      allSessions[platform] = normalizePlatformSession(platform, data, options);
      writeSessionFile(JSON.stringify(allSessions, null, 2));
      return true;
    } catch (error) {
      logger.error(
        `Failed to save session for ${platform}:`,
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  /**
   * @param {string | null} [platform]
   * @returns {boolean}
   */
  function clear(platform = null) {
    try {
      if (!existsSync(filePath)) return true;
      if (platform) {
        const allSessions = /** @type {Record<string, unknown>} */ (load() || {});
        delete allSessions[platform];
        writeSessionFile(JSON.stringify(allSessions, null, 2));
      } else {
        writeSessionFile('{}');
      }
      return true;
    } catch (error) {
      logger.error(
        '[SessionManager.clear] Failed to clear session:',
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  return { load, save, clear };
}

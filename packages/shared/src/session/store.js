import { dirname as defaultDirname } from 'node:path';
import { getSessionTtlMs } from './constants.js';
import { normalizePlatformSession } from './normalization.js';

export function isPlatformSessionValid(session, platform, options = {}) {
  const now = options.now ?? Date.now();
  const getTtlMs = options.getTtlMs || getSessionTtlMs;
  return !!(session && session.timestamp && now - session.timestamp < getTtlMs(platform));
}

export function createMemorySessionStore(initial = {}, options = {}) {
  const sessions = new Map(Object.entries(initial));
  return {
    load(platform = null) {
      if (!platform) return Object.fromEntries(sessions);
      const session = sessions.get(platform);
      return isPlatformSessionValid(session, platform, options) ? session : null;
    },
    save(platform, session) {
      sessions.set(platform, normalizePlatformSession(platform, session, options));
      return true;
    },
    clear(platform = null) {
      if (platform) sessions.delete(platform);
      else sessions.clear();
      return true;
    },
  };
}

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

  function writeSessionFile(contents) {
    writeFileSync(filePath, contents, { mode: privateFileMode });
    config.chmodSync?.(filePath, privateFileMode);
  }

  function load(platform = null) {
    try {
      if (!existsSync(filePath)) return platform ? null : {};
      const allSessions = JSON.parse(readFileSync(filePath, 'utf-8'));
      if (!platform) return allSessions;
      const session = allSessions[platform];
      return isPlatformSessionValid(session, platform, options) ? session : null;
    } catch (error) {
      logger.error('Failed to load sessions:', error.message);
      return platform ? null : {};
    }
  }

  function save(platform, data) {
    try {
      ensureDir();
      const allSessions = load() || {};
      allSessions[platform] = normalizePlatformSession(platform, data, options);
      writeSessionFile(JSON.stringify(allSessions, null, 2));
      return true;
    } catch (error) {
      logger.error(`Failed to save session for ${platform}:`, error.message);
      return false;
    }
  }

  function clear(platform = null) {
    try {
      if (!existsSync(filePath)) return true;
      if (platform) {
        const allSessions = load() || {};
        delete allSessions[platform];
        writeSessionFile(JSON.stringify(allSessions, null, 2));
      } else {
        writeSessionFile('{}');
      }
      return true;
    } catch (error) {
      logger.error('[SessionManager.clear] Failed to clear session:', error.message);
      return false;
    }
  }

  return { load, save, clear };
}

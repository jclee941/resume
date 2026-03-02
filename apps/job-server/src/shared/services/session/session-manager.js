import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

const SHARED_DATA_DIR = join(homedir(), '.opencode', 'data');
const SESSION_FILE = join(SHARED_DATA_DIR, 'sessions.json');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const PLATFORMS = ['wanted', 'saramin', 'jobkorea', 'remember', 'linkedin'];

const ensureDir = (filePath) => {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

export class SessionManager {
  static load(platform = null) {
    try {
      if (existsSync(SESSION_FILE)) {
        const allSessions = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
        if (platform) {
          const session = allSessions[platform];
          if (
            session &&
            session.timestamp &&
            Date.now() - session.timestamp < SESSION_TTL_MS
          ) {
            return session;
          }
          return null;
        }
        return allSessions;
      }
    } catch (e) {
      console.error('Failed to load sessions:', e.message);
    }
    return platform ? null : {};
  }

  static save(platform, data) {
    try {
      ensureDir(SESSION_FILE);
      const allSessions = this.load() || {};

      allSessions[platform] = {
        ...data,
        timestamp: Date.now(),
      };

      writeFileSync(SESSION_FILE, JSON.stringify(allSessions, null, 2));
      return true;
    } catch (e) {
      console.error(`Failed to save session for ${platform}:`, e.message);
      return false;
    }
  }

  static clear(platform = null) {
    try {
      if (!existsSync(SESSION_FILE)) return true;

      if (platform) {
        const allSessions = this.load() || {};
        delete allSessions[platform];
        writeFileSync(SESSION_FILE, JSON.stringify(allSessions, null, 2));
      } else {
        writeFileSync(SESSION_FILE, '{}');
      }
      return true;
    } catch {
      return false;
    }
  }

  static async getAPI(platform = 'wanted') {
    const session = this.load(platform);
    if (!session || !session.cookies) return null;

    // Dynamic import to avoid circular dependency
    // Returns a configured API instance with session cookies
    const WantedAPI = (await import('../../clients/wanted/index.js')).default;
    const api = new WantedAPI();
    api.setCookies(session.cookies);
    return api;
  }

  static getStatus() {
    const sessions = this.load() || {};

    return PLATFORMS.map((p) => {
      const session = sessions[p];
      const isValid =
        session &&
        session.timestamp &&
        Date.now() - session.timestamp < SESSION_TTL_MS;

      return {
        platform: p,
        authenticated: !!isValid,
        email: session?.email || null,
        expiresAt: session?.timestamp
          ? new Date(session.timestamp + SESSION_TTL_MS).toISOString()
          : null,
        lastUpdated: session?.timestamp
          ? new Date(session.timestamp).toISOString()
          : null,
      };
    });
  }
}

export default SessionManager;

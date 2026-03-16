import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

const SHARED_DATA_DIR = join(homedir(), '.opencode', 'data');
const SESSION_FILE = join(SHARED_DATA_DIR, 'sessions.json');

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const PLATFORM_TTL_MS = {
  jobkorea: 30 * 24 * 60 * 60 * 1000,
  wanted: 24 * 60 * 60 * 1000,
  saramin: 7 * 24 * 60 * 60 * 1000,
  linkedin: 7 * 24 * 60 * 60 * 1000,
  remember: 30 * 24 * 60 * 60 * 1000,
};
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
          const platformTtl = PLATFORM_TTL_MS[platform] || DEFAULT_TTL_MS;
          if (session && session.timestamp && Date.now() - session.timestamp < platformTtl) {
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
      const platformTtl = PLATFORM_TTL_MS[p] || DEFAULT_TTL_MS;
      const isValid = session && session.timestamp && Date.now() - session.timestamp < platformTtl;

      return {
        platform: p,
        authenticated: !!isValid,
        email: session?.email || null,
        expiresAt: session?.timestamp
          ? new Date(session.timestamp + platformTtl).toISOString()
          : null,
        lastUpdated: session?.timestamp ? new Date(session.timestamp).toISOString() : null,
      };
    });
  }

  /**
   * Check if a session is expiring soon (within given threshold).
   * @param {string} platform - Platform name
   * @param {number} thresholdMs - Milliseconds before expiry to consider "expiring"
   * @returns {{ valid: boolean, expiringSoon: boolean, expiresAt: Date|null }}
   */
  static checkHealth(platform, thresholdMs = 2 * 60 * 60 * 1000) {
    const session = this.load(platform);
    if (!session || !session.timestamp) {
      return { valid: false, expiringSoon: false, expiresAt: null };
    }
    const ttl = PLATFORM_TTL_MS[platform] || DEFAULT_TTL_MS;
    const expiresAt = new Date(session.timestamp + ttl);
    const remaining = expiresAt.getTime() - Date.now();
    return {
      valid: remaining > 0,
      expiringSoon: remaining > 0 && remaining < thresholdMs,
      expiresAt,
    };
  }

  /**
   * Attempt to refresh a session by running CDP extraction.
   * Returns true if session was refreshed, false otherwise.
   * @param {string} platform - Platform to refresh
   * @returns {Promise<boolean>}
   */
  static async tryRefresh(platform) {
    const { execSync } = await import('child_process');
    const { fileURLToPath } = await import('url');
    const { dirname: dn, join: jn } = await import('path');
    const __dirname = dn(fileURLToPath(import.meta.url));
    const cdpScript = jn(__dirname, '..', '..', '..', '..', 'scripts', 'extract-cookies-cdp.js');

    try {
      execSync(`node ${cdpScript} ${platform}`, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 15000,
      });
      // Check if extraction succeeded
      const session = this.load(platform);
      return !!(session && session.timestamp && Date.now() - session.timestamp < 60000);
    } catch {
      return false;
    }
  }
}

export default SessionManager;

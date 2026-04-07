import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { getResumeBasePath } from '../../utils/paths.js';

const SHARED_DATA_DIR = getResumeBasePath();
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
  static logger = console;

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
      SessionManager.logger.error('Failed to load sessions:', e.message);
    }
    return platform ? null : {};
  }

  static save(platform, data) {
    try {
      ensureDir(SESSION_FILE);
      const allSessions = this.load() || {};

      // Normalize session contract at the boundary
      const normalized = { ...data };

      // Always set platform
      normalized.platform = platform;

      // Normalize cookies: string → cookieString, cookies: null
      if (typeof normalized.cookies === 'string') {
        if (!normalized.cookieString) {
          normalized.cookieString = normalized.cookies;
        }
        normalized.cookies = null;
      }

      // If cookies is array, compute cookieString if missing
      if (Array.isArray(normalized.cookies) && !normalized.cookieString) {
        normalized.cookieString = normalized.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      }

      // Set cookieCount if missing
      if (normalized.cookieCount == null) {
        if (Array.isArray(normalized.cookies)) {
          normalized.cookieCount = normalized.cookies.length;
        } else if (normalized.cookieString) {
          normalized.cookieCount = normalized.cookieString.split(';').filter(Boolean).length;
        } else {
          normalized.cookieCount = 0;
        }
      }

      // Set expiresAt if missing
      if (!normalized.expiresAt) {
        const ttl = PLATFORM_TTL_MS[platform] || DEFAULT_TTL_MS;
        normalized.expiresAt = new Date(Date.now() + ttl).toISOString();
      }

      allSessions[platform] = {
        ...normalized,
        timestamp: Date.now(),
      };

      writeFileSync(SESSION_FILE, JSON.stringify(allSessions, null, 2));
      return true;
    } catch (e) {
      SessionManager.logger.error(`Failed to save session for ${platform}:`, e.message);
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
    } catch (error) {
      SessionManager.logger.error('[SessionManager.clear] Failed to clear session:', error.message);
      return false;
    }
  }

  static async getAPI(platform = 'wanted') {
    const session = this.load(platform);
    if (!session) return null;

    // Need either cookies/cookieString or token
    if (!session.cookies && !session.cookieString && !session.token) return null;

    // Dynamic import to avoid circular dependency
    const WantedAPI = (await import('../../clients/wanted/index.js')).default;
    const api = new WantedAPI();
    const cookieStr =
      session.cookieString ||
      (Array.isArray(session.cookies)
        ? session.cookies.map((c) => `${c.name}=${c.value}`).join('; ')
        : session.cookies) ||
      session.token;
    if (cookieStr) {
      api.setCookies(cookieStr);
    }
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
  static checkHealth(platform, thresholdMs = 2 * 60 * 60 * 1000, validateContent = false) {
    const session = this.load(platform);
    if (!session || !session.timestamp) {
      return { valid: false, expiringSoon: false, expiresAt: null, reason: 'no_session' };
    }
    
    // Check timestamp validity
    const ttl = PLATFORM_TTL_MS[platform] || DEFAULT_TTL_MS;
    const expiresAt = new Date(session.timestamp + ttl);
    const remaining = expiresAt.getTime() - Date.now();
    const timestampValid = remaining > 0;
    
    // Optional: validate session content (cookies, tokens)
    if (validateContent && timestampValid) {
      const contentValidation = this.validateSessionContent(platform, session);
      if (!contentValidation.valid) {
        return {
          valid: false,
          expiringSoon: false,
          expiresAt,
          reason: contentValidation.reason,
        };
      }
    }
    
    return {
      valid: timestampValid,
      expiringSoon: timestampValid && remaining < thresholdMs,
      expiresAt,
    };
  }

  /**
   * Validate session content (cookies, tokens) for actual authentication state
   * @param {string} platform - Platform name
   * @param {Object} session - Session object
   * @returns {{ valid: boolean, reason: string|null }}
   */
  static validateSessionContent(platform, session) {
    // Check for empty or invalid cookie values
    if (session.cookieString) {
      // Parse cookie string and check for empty critical values
      const cookies = session.cookieString.split(';').map(c => c.trim());
      
      for (const cookie of cookies) {
        const [name, ...valueParts] = cookie.split('=');
        const value = valueParts.join('=').trim();
        
        // Check for empty values in critical auth cookies
        if (name && value === '' && ['UID', 'User', 'session', 'token'].some(critical => 
          name.toLowerCase().includes(critical.toLowerCase()))) {
          return { valid: false, reason: `empty_${name}` };
        }
      }
    }
    
    // Platform-specific validations
    if (platform === 'jobkorea' && session.cookies) {
      // Check for JobKorea specific cookies
      const userCookie = session.cookies.find(c => c.name === 'User');
      const cUserCookie = session.cookies.find(c => c.name === 'C%5FUSER' || c.name === 'C_USER');
      
      if (userCookie) {
        const decodedValue = decodeURIComponent(userCookie.value);
        if (decodedValue.includes('UID=&') || decodedValue.includes('UID=')) {
          const uidMatch = decodedValue.match(/UID=([^&]*)/);
          if (!uidMatch || !uidMatch[1]) {
            return { valid: false, reason: 'empty_jobkorea_uid' };
          }
        }
      }
      
      if (cUserCookie) {
        const decodedValue = decodeURIComponent(cUserCookie.value);
        if (decodedValue.includes('UID=&') || decodedValue === 'UID=') {
          return { valid: false, reason: 'empty_jobkorea_cuser_uid' };
        }
      }
    }
    
    if (platform === 'wanted') {
      // Wanted should have cookieString or cookies
      if (!session.cookieString && !session.cookies) {
        return { valid: false, reason: 'no_wanted_cookies' };
      }
      
      // Check for token in cookie string
      if (session.cookieString && !session.cookieString.includes('ONEID')) {
        // Not necessarily invalid, but might be using old auth method
        console.warn('[SessionManager] Wanted session missing ONEID token');
      }
    }
    
    return { valid: true, reason: null };
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
    } catch (error) {
      SessionManager.logger.error(
        '[SessionManager.tryRefresh] CDP extraction failed:',
        error.message
      );
      return false;
    }
  }
  /**
   * Check if session needs renewal (TTL threshold reached)
   * @param {string} platform - Platform name
   * @param {number} threshold - Threshold ratio (0-1), default 0.8
   * @returns {boolean}
   */
  static isRenewalNeeded(platform, threshold = 0.8) {
    const session = this.load(platform);
    if (!session || !session.timestamp || !session.expiresAt) {
      return true;
    }
    
    const now = Date.now();
    const expiresAt = new Date(session.expiresAt).getTime();
    const totalLifetime = expiresAt - session.timestamp;
    const elapsed = now - session.timestamp;
    
    return elapsed >= totalLifetime * threshold;
  }

  /**
   * Get session with metadata for renewal decisions
   * @param {string} platform - Platform name
   * @returns {{exists: boolean, valid: boolean, needsRenewal: boolean, session: object|null}}
   */
  static getSessionStatus(platform) {
    const session = this.load(platform);
    
    if (!session) {
      return { exists: false, valid: false, needsRenewal: true, session: null };
    }
    
    const now = Date.now();
    const platformTtl = PLATFORM_TTL_MS[platform] || DEFAULT_TTL_MS;
    const isValid = session.timestamp && (now - session.timestamp < platformTtl);
    const needsRenewal = this.isRenewalNeeded(platform);
    
    return {
      exists: true,
      valid: isValid,
      needsRenewal,
      session,
    };
  }

  /**
   * Get encrypted session data for external storage
   * @param {string} platform - Platform name
   * @returns {string|null} - Base64 encoded encrypted session
   */
  static getEncryptedSession(platform) {
    const session = this.load(platform);
    if (!session) return null;
    
    try {
      const payload = JSON.stringify({
        platform,
        session,
        exportedAt: Date.now(),
      });
      return Buffer.from(payload).toString('base64');
    } catch (e) {
      SessionManager.logger.error('[SessionManager.getEncryptedSession] Failed:', e.message);
      return null;
    }
  }

  /**
   * Restore session from encrypted data
   * @param {string} platform - Platform name
   * @param {string} encryptedData - Base64 encoded encrypted session
   * @returns {boolean}
   */
  static restoreEncryptedSession(platform, encryptedData) {
    try {
      const payload = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      
      if (payload.platform !== platform) {
        SessionManager.logger.error('[SessionManager.restoreEncryptedSession] Platform mismatch');
        return false;
      }
      
      return this.save(platform, payload.session);
    } catch (e) {
      SessionManager.logger.error('[SessionManager.restoreEncryptedSession] Failed:', e.message);
      return false;
    }
  }


}

export default SessionManager;

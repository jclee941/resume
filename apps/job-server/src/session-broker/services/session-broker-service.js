import CloakBrowser from '../browser/cloak-browser.js';
import EncryptionService from './encryption-service.js';

const DEFAULT_SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TTL_THRESHOLD = 0.8;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 30_000;

export const SESSION_STATES = Object.freeze({
  VALID: 'VALID',
  VALIDATING: 'VALIDATING',
  RENEW_NEEDED: 'RENEW_NEEDED',
  RENEWING: 'RENEWING',
  EXPIRED: 'EXPIRED',
});

export const SUPPORTED_SESSION_BROKER_PLATFORMS = Object.freeze(['wanted']);

function normalizePlatform(platform) {
  if (typeof platform !== 'string' || platform.trim().length === 0) {
    throw new TypeError('platform must be a non-empty string');
  }
  return platform.trim().toLowerCase();
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class WantedLoginFlow {
  constructor(options = {}) {
    this.browser = options.browser || new CloakBrowser();
    this.encryptionService = options.encryptionService || null;
    this.logger = options.logger || console;
  }

  async execute(platform) {
    if (platform !== 'wanted') {
      throw new Error(`WantedLoginFlow only supports 'wanted' platform, got: ${platform}`);
    }

    const browser = await this.browser.launch({
      proxy: process.env.WANTED_PROXY,
      timezone: 'Asia/Seoul',
      locale: 'ko-KR',
    });

    try {
      await browser.goto('https://www.wanted.co.kr');
      await defaultSleep(2000);

      const profileElement = await browser.evaluate(() => {
        return !!document.querySelector('[data-testid="profile-button"]');
      });

      if (profileElement) {
        this.logger.log('[WantedLoginFlow] Already logged in');
        const cookies = await browser.getCookies();
        return this.buildSessionData(platform, cookies);
      }

      this.logger.log('[WantedLoginFlow] Navigating to login page');
      await browser.goto('https://www.wanted.co.kr/login');
      await defaultSleep(2000);

      const email = process.env.WANTED_EMAIL;
      const password = process.env.WANTED_PASSWORD;

      if (!email || !password) {
        throw new Error('WANTED_EMAIL and WANTED_PASSWORD environment variables required');
      }

      await browser.evaluate(
        (email, password) => {
          const emailInput = document.querySelector('input[type="email"]');
          const passwordInput = document.querySelector('input[type="password"]');
          if (emailInput) emailInput.value = email;
          if (passwordInput) passwordInput.value = password;
        },
        email,
        password
      );

      await browser.evaluate(() => {
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) submitButton.click();
      });

      await defaultSleep(3000);

      const captchaDetected = await browser.evaluate(() => {
        return (
          !!document.querySelector('[data-testid="captcha"]') ||
          document.body.textContent.includes('CAPTCHA') ||
          document.body.textContent.includes('보안문자')
        );
      });

      if (captchaDetected) {
        throw new Error('ERR_WANTED_CAPTCHA_DETECTED: Manual intervention required');
      }

      const wafBlock = await browser.evaluate(() => {
        return (
          document.body.textContent.includes('CloudFront') ||
          document.body.textContent.includes('Access Denied')
        );
      });

      if (wafBlock) {
        throw new Error('ERR_WANTED_WAF_BLOCKED: CloudFront WAF challenge detected');
      }

      const loggedIn = await browser.evaluate(() => {
        return !!document.querySelector('[data-testid="profile-button"]');
      });

      if (!loggedIn) {
        throw new Error('ERR_WANTED_LOGIN_FAILED: Login was not successful');
      }

      this.logger.log('[WantedLoginFlow] Login successful');
      const cookies = await browser.getCookies();
      return this.buildSessionData(platform, cookies);
    } finally {
      await browser.close();
    }
  }

  async renew() {
    return this.execute('wanted');
  }

  buildSessionData(platform, cookies) {
    const session = {
      platform,
      cookies,
      cookieString: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      cookieCount: cookies.length,
      renewedAt: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + DEFAULT_SESSION_LIFETIME_MS).toISOString(),
    };

    if (this.encryptionService) {
      session.encryptedSession = this.encryptionService.encrypt(session);
    }

    return session;
  }
}

/**
 * SessionBrokerService
 *
 * Dual-mode design:
 * - Production: uses SessionManager for persistent session storage and
 *   WantedLoginFlow for real browser-based session renewal. Instantiated
 *   by session-broker-routes.js as `new SessionBrokerService()`.
 * - Test: accepts dependency-injected `sessionStore` (Map), `stateStore`
 *   (Map), `platforms` array, `loginFlowFactories`, `now`/`sleep` clocks,
 *   and `browserFactory` so tests can verify behavior without I/O.
 *
 * State entries stored in stateStore are objects of shape:
 *   { state: SESSION_STATES, lastError: string|null, expiresAt, renewedAt }
 */
export default class SessionBrokerService {
  constructor(options = {}) {
    // Dependency injection hooks (test-friendly)
    this.sessionStore = options.sessionStore ?? null;
    this.stateStore = options.stateStore ?? new Map();
    this.platforms = options.platforms
      ? [...options.platforms]
      : [...SUPPORTED_SESSION_BROKER_PLATFORMS];
    this.loginFlowFactories = options.loginFlowFactories ?? {};
    this.nowFn = options.now ?? (() => Date.now());
    this.sleepFn = options.sleep ?? defaultSleep;
    this.browserFactory = options.browserFactory ?? null;

    // Production dependencies
    this.encryptionService = options.encryptionService || new EncryptionService();
    this.browser =
      options.browser || (this.browserFactory ? this.browserFactory() : new CloakBrowser());
    this.logger = options.logger || console;

    // Configuration
    this.sessionLifetimeMs = options.sessionLifetimeMs || DEFAULT_SESSION_LIFETIME_MS;
    this.ttlThreshold = options.ttlThreshold ?? DEFAULT_TTL_THRESHOLD;
    this.retryAttempts = options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

    // Fallback login flows (production mode). Only set up for platforms
    // we have built-in support for. Custom loginFlowFactories always win.
    this.loginFlows = {
      wanted: new WantedLoginFlow({
        browser: this.browser,
        encryptionService: this.encryptionService,
        logger: this.logger,
      }),
    };
  }

  /**
   * Get the current state string for a platform.
   * Returns SESSION_STATES.EXPIRED if no entry exists.
   */
  getState(platform) {
    const normalized = normalizePlatform(platform);
    const entry = this.stateStore.get(normalized);
    return entry?.state ?? SESSION_STATES.EXPIRED;
  }

  /**
   * Get the full state entry for a platform (for debugging/inspection).
   */
  getStateEntry(platform) {
    const normalized = normalizePlatform(platform);
    return this.stateStore.get(normalized) ?? null;
  }

  /**
   * Update the state entry for a platform. Existing entry fields are
   * preserved unless explicitly overwritten.
   */
  setState(platform, stateOrEntry) {
    const normalized = normalizePlatform(platform);
    const existing = this.stateStore.get(normalized) ?? {};
    const patch = typeof stateOrEntry === 'string' ? { state: stateOrEntry } : (stateOrEntry ?? {});
    this.stateStore.set(normalized, { ...existing, ...patch });
  }

  /**
   * Load a raw session record for a platform from the configured store.
   * Tests provide a Map `sessionStore`. Production falls back to SessionManager.
   * Returns null if no session exists.
   */
  async #loadSession(normalized) {
    if (this.sessionStore && typeof this.sessionStore.get === 'function') {
      const raw = this.sessionStore.get(normalized);
      if (raw == null) return null;
      try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (error) {
        this.logger.error('[SessionBrokerService] Failed to parse session:', error.message);
        return null;
      }
    }

    // Production path: SessionManager persistent storage
    try {
      const { SessionManager } = await import('./index.js');
      return SessionManager.load(normalized) ?? null;
    } catch (error) {
      this.logger.error('[SessionBrokerService] SessionManager load failed:', error.message);
      return null;
    }
  }

  /**
   * Persist a session record. Tests capture into the Map; production
   * delegates to SessionManager.
   */
  async #saveSession(normalized, session) {
    const record = {
      platform: normalized,
      ...session,
    };

    if (this.sessionStore && typeof this.sessionStore.set === 'function') {
      this.sessionStore.set(normalized, JSON.stringify(record));
      return;
    }

    try {
      const { SessionManager } = await import('./index.js');
      SessionManager.save(normalized, record);
    } catch (error) {
      this.logger.error('[SessionBrokerService] SessionManager save failed:', error.message);
    }
  }

  /**
   * Normalize a session-renewal response to a canonical shape with
   * cookieString, renewedAt, expiresAt.
   */
  #normalizeRenewalResult(session) {
    if (!session || typeof session !== 'object') {
      return null;
    }

    let cookieString = typeof session.cookieString === 'string' ? session.cookieString : null;
    if (!cookieString && Array.isArray(session.cookies)) {
      cookieString = session.cookies
        .map((c) => `${c.name ?? ''}=${c.value ?? ''}`)
        .filter((pair) => pair !== '=')
        .join('; ');
    }

    return {
      cookieString: cookieString ?? '',
      renewedAt: session.renewedAt ?? session.extractedAt ?? null,
      expiresAt: session.expiresAt ?? null,
    };
  }

  /**
   * Check whether a stored session is valid. Returns:
   *   - { valid: true, expiresAt, renewedAt }         on success
   *   - { valid: false, error, expiresAt?, renewedAt? } on miss/expired
   *
   * Also updates stateStore entry for the platform as a side effect.
   */
  async checkSession(platform) {
    const normalized = normalizePlatform(platform);

    const currentState = this.getState(normalized);
    if (currentState === SESSION_STATES.RENEWING) {
      return { valid: false, error: 'Session renewal in progress' };
    }

    const session = await this.#loadSession(normalized);
    if (!session) {
      this.setState(normalized, {
        state: SESSION_STATES.EXPIRED,
        lastError: 'No stored session',
        expiresAt: null,
        renewedAt: null,
      });
      return { valid: false, error: 'No stored session' };
    }

    const expiresAtRaw = session.expiresAt ?? null;
    const renewedAtRaw = session.renewedAt ?? session.extractedAt ?? session.timestamp ?? null;

    const expiresMs = expiresAtRaw ? Date.parse(expiresAtRaw) : NaN;
    const renewedMs = renewedAtRaw ? Date.parse(renewedAtRaw) : NaN;

    if (!Number.isFinite(expiresMs) || !Number.isFinite(renewedMs)) {
      this.setState(normalized, {
        state: SESSION_STATES.EXPIRED,
        lastError: 'Invalid session timestamps',
        expiresAt: expiresAtRaw,
        renewedAt: renewedAtRaw,
      });
      return { valid: false, error: 'Invalid session timestamps' };
    }

    const now = this.nowFn();

    if (now >= expiresMs) {
      this.setState(normalized, {
        state: SESSION_STATES.EXPIRED,
        lastError: null,
        expiresAt: expiresAtRaw,
        renewedAt: renewedAtRaw,
      });
      return { valid: false, expiresAt: expiresAtRaw, renewedAt: renewedAtRaw };
    }

    const lifetime = expiresMs - renewedMs;
    const elapsed = now - renewedMs;

    if (lifetime > 0 && elapsed >= lifetime * this.ttlThreshold) {
      this.setState(normalized, {
        state: SESSION_STATES.RENEW_NEEDED,
        lastError: null,
        expiresAt: expiresAtRaw,
        renewedAt: renewedAtRaw,
      });
      return { valid: true, expiresAt: expiresAtRaw, renewedAt: renewedAtRaw };
    }

    this.setState(normalized, {
      state: SESSION_STATES.VALID,
      lastError: null,
      expiresAt: expiresAtRaw,
      renewedAt: renewedAtRaw,
    });
    return { valid: true, expiresAt: expiresAtRaw, renewedAt: renewedAtRaw };
  }

  /**
   * Instantiate a login flow for a platform. Uses configured
   * loginFlowFactories first (test mode), then falls back to built-in
   * WantedLoginFlow (production mode). Returns null if neither is available.
   */
  #getLoginFlow(normalized) {
    const factory = this.loginFlowFactories[normalized];
    if (typeof factory === 'function') {
      return factory();
    }
    return this.loginFlows[normalized] ?? null;
  }

  /**
   * Attempt to renew a session via login flow, with configured retry logic.
   * Returns { success: true, session } or { success: false, error }.
   */
  async renewSession(platform) {
    const normalized = normalizePlatform(platform);

    const flow = this.#getLoginFlow(normalized);
    if (!flow) {
      const error = `No login flow available for platform: ${normalized}`;
      this.setState(normalized, {
        state: SESSION_STATES.EXPIRED,
        lastError: error,
      });
      return { success: false, error };
    }

    this.setState(normalized, {
      state: SESSION_STATES.RENEWING,
      lastError: null,
    });

    let lastError;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        this.logger.log?.(
          `[SessionBrokerService] Renewing ${normalized} (attempt ${attempt}/${this.retryAttempts})`
        );

        const rawSession =
          typeof flow.renew === 'function' ? await flow.renew() : await flow.execute(normalized);

        const normalizedSession = this.#normalizeRenewalResult(rawSession);
        if (!normalizedSession) {
          throw new Error('Login flow returned invalid session');
        }

        await this.#saveSession(normalized, normalizedSession);

        this.setState(normalized, {
          state: SESSION_STATES.VALID,
          lastError: null,
          expiresAt: normalizedSession.expiresAt,
          renewedAt: normalizedSession.renewedAt,
        });

        return {
          success: true,
          session: {
            platform: normalized,
            ...normalizedSession,
          },
        };
      } catch (error) {
        lastError = error;
        this.logger.error?.(
          `[SessionBrokerService] Renewal attempt ${attempt} failed: ${error.message}`
        );

        if (attempt < this.retryAttempts) {
          await this.sleepFn(this.retryDelayMs);
        }
      }
    }

    const errorMessage = lastError?.message ?? 'Max retry attempts exceeded';
    this.setState(normalized, {
      state: SESSION_STATES.EXPIRED,
      lastError: errorMessage,
    });
    return { success: false, error: errorMessage };
  }

  /**
   * Get a valid session, renewing if necessary.
   * Returns { valid: true, session } or { valid: false, error }.
   */
  async getValidSession(platform) {
    const normalized = normalizePlatform(platform);
    const check = await this.checkSession(normalized);
    const stateAfterCheck = this.getState(normalized);

    if (stateAfterCheck === SESSION_STATES.VALID && check.valid) {
      return { valid: true, session: check };
    }

    if (
      stateAfterCheck === SESSION_STATES.RENEW_NEEDED ||
      stateAfterCheck === SESSION_STATES.EXPIRED
    ) {
      const renewal = await this.renewSession(normalized);
      if (renewal.success) {
        return { valid: true, session: renewal.session };
      }
      return { valid: false, error: renewal.error };
    }

    return {
      valid: false,
      error: check.error ?? 'Unknown session state',
    };
  }

  /**
   * Validate an already-decrypted session blob. Used by handlers that
   * receive encrypted cookies over the wire.
   */
  async validateEncryptedSession(platform, encryptedSession) {
    try {
      const decrypted = this.encryptionService.decrypt(encryptedSession);
      if (!decrypted || decrypted.platform !== platform) {
        return { valid: false, error: 'Invalid session or platform mismatch' };
      }
      return { valid: true, decrypted };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Produce a health status for every configured platform.
   * Return shape:
   *   {
   *     status: 'healthy' | 'degraded',
   *     platforms: {
   *       <platform>: {
   *         state, valid, expiresAt, renewedAt, lastError
   *       }
   *     }
   *   }
   */
  async getHealth() {
    const platforms = {};

    for (const platformName of this.platforms) {
      const normalized = normalizePlatform(platformName);
      const session = await this.#loadSession(normalized);

      if (!session) {
        this.setState(normalized, {
          state: SESSION_STATES.EXPIRED,
          lastError: 'No stored session',
          expiresAt: null,
          renewedAt: null,
        });
        platforms[normalized] = {
          state: SESSION_STATES.EXPIRED,
          valid: false,
          expiresAt: null,
          renewedAt: null,
          lastError: 'No stored session',
        };
        continue;
      }

      const check = await this.checkSession(normalized);
      const entry = this.stateStore.get(normalized) ?? {};

      platforms[normalized] = {
        state: entry.state ?? SESSION_STATES.EXPIRED,
        valid: check.valid === true,
        expiresAt: check.expiresAt ?? entry.expiresAt ?? null,
        renewedAt: check.renewedAt ?? entry.renewedAt ?? null,
        lastError: entry.lastError ?? null,
      };
    }

    const allValid = Object.values(platforms).every((p) => p.valid);

    return {
      status: allValid ? 'healthy' : 'degraded',
      platforms,
    };
  }

  /**
   * Alias for getHealth() kept for backward compatibility.
   */
  healthCheck() {
    return this.getHealth();
  }
}

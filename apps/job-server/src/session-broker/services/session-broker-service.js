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

function readEnvNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizePlatform(platform) {
  if (typeof platform !== 'string' || platform.trim().length === 0) {
    throw new TypeError('platform must be a non-empty string');
  }
  return platform.trim().toLowerCase();
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string') {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  return null;
}

function sleep(ms) {
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
      await sleep(2000);

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
      await sleep(2000);

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

      await sleep(3000);

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

  buildSessionData(platform, cookies) {
    const session = {
      platform,
      cookies,
      cookieString: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      cookieCount: cookies.length,
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + DEFAULT_SESSION_LIFETIME_MS).toISOString(),
    };

    if (this.encryptionService) {
      session.encryptedSession = this.encryptionService.encrypt(session);
    }

    return session;
  }
}

export default class SessionBrokerService {
  constructor(options = {}) {
    this.encryptionService = options.encryptionService || new EncryptionService();
    this.browser = options.browser || new CloakBrowser();
    this.logger = options.logger || console;

    this.sessionLifetimeMs = options.sessionLifetimeMs || DEFAULT_SESSION_LIFETIME_MS;
    this.ttlThreshold = options.ttlThreshold ?? DEFAULT_TTL_THRESHOLD;
    this.retryAttempts = options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

    this.stateStore = new Map();
    this.loginFlows = {
      wanted: new WantedLoginFlow({
        browser: this.browser,
        encryptionService: this.encryptionService,
        logger: this.logger,
      }),
    };
  }

  getState(platform) {
    return this.stateStore.get(platform) || SESSION_STATES.EXPIRED;
  }

  setState(platform, state) {
    this.stateStore.set(platform, state);
  }

  async checkSession(platform) {
    const normalized = normalizePlatform(platform);
    const currentState = this.getState(normalized);

    if (currentState === SESSION_STATES.RENEWING) {
      return {
        valid: false,
        state: currentState,
        message: 'Session renewal in progress',
      };
    }

    try {
      const { SessionManager } = await import('./index.js');
      const session = SessionManager.load(normalized);

      if (!session) {
        this.setState(normalized, SESSION_STATES.EXPIRED);
        return {
          valid: false,
          state: SESSION_STATES.EXPIRED,
          message: 'No session found',
        };
      }

      const expiresAt = new Date(session.expiresAt).getTime();
      const now = Date.now();
      const totalLifetime = expiresAt - (session.timestamp || now);
      const elapsed = now - (session.timestamp || now);

      if (elapsed >= totalLifetime * this.ttlThreshold) {
        this.setState(normalized, SESSION_STATES.RENEW_NEEDED);
        return {
          valid: true,
          state: SESSION_STATES.RENEW_NEEDED,
          expiresAt: session.expiresAt,
          renewedAt: session.extractedAt || session.timestamp,
          message: 'Session valid but renewal recommended',
        };
      }

      if (now >= expiresAt) {
        this.setState(normalized, SESSION_STATES.EXPIRED);
        return {
          valid: false,
          state: SESSION_STATES.EXPIRED,
          expiresAt: session.expiresAt,
          message: 'Session expired',
        };
      }

      this.setState(normalized, SESSION_STATES.VALID);
      return {
        valid: true,
        state: SESSION_STATES.VALID,
        expiresAt: session.expiresAt,
        renewedAt: session.extractedAt || session.timestamp,
        message: 'Session valid',
      };
    } catch (error) {
      this.logger.error(`[SessionBrokerService] Check session failed:`, error.message);
      return {
        valid: false,
        state: SESSION_STATES.EXPIRED,
        error: error.message,
      };
    }
  }

  async renewSession(platform) {
    const normalized = normalizePlatform(platform);
    this.setState(normalized, SESSION_STATES.RENEWING);

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const loginFlow = this.loginFlows[normalized];
        if (!loginFlow) {
          throw new Error(`No login flow available for platform: ${normalized}`);
        }

        this.logger.log(
          `[SessionBrokerService] Renewing session for ${normalized} (attempt ${attempt}/${this.retryAttempts})`
        );

        const session = await loginFlow.execute(normalized);
        const { SessionManager } = await import('./index.js');
        SessionManager.save(normalized, session);

        this.setState(normalized, SESSION_STATES.VALID);

        return {
          success: true,
          session: {
            valid: true,
            expiresAt: session.expiresAt,
            renewedAt: session.extractedAt,
          },
        };
      } catch (error) {
        this.logger.error(
          `[SessionBrokerService] Renewal attempt ${attempt} failed:`,
          error.message
        );

        if (attempt === this.retryAttempts) {
          this.setState(normalized, SESSION_STATES.EXPIRED);
          return {
            success: false,
            error: error.message,
            attempts: attempt,
          };
        }

        this.logger.log(`[SessionBrokerService] Waiting ${this.retryDelayMs}ms before retry...`);
        await sleep(this.retryDelayMs);
      }
    }

    return {
      success: false,
      error: 'Max retry attempts exceeded',
    };
  }

  async getValidSession(platform) {
    const check = await this.checkSession(platform);

    if (check.state === SESSION_STATES.VALID) {
      return {
        valid: true,
        session: check,
      };
    }

    if (check.state === SESSION_STATES.RENEW_NEEDED || check.state === SESSION_STATES.EXPIRED) {
      const renewal = await this.renewSession(platform);

      if (renewal.success) {
        return {
          valid: true,
          session: renewal.session,
        };
      }

      return {
        valid: false,
        error: renewal.error,
      };
    }

    return {
      valid: false,
      error: check.error || 'Unknown session state',
    };
  }

  async validateEncryptedSession(platform, encryptedSession) {
    try {
      const decrypted = this.encryptionService.decrypt(encryptedSession);

      if (!decrypted || decrypted.platform !== platform) {
        return {
          valid: false,
          error: 'Invalid session or platform mismatch',
        };
      }

      return {
        valid: true,
        decrypted,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  async getHealth() {
    const platforms = {};

    for (const platform of SUPPORTED_SESSION_BROKER_PLATFORMS) {
      const state = this.getState(platform);
      const check = await this.checkSession(platform).catch(() => ({ valid: false }));

      platforms[platform] = {
        state,
        valid: check.valid,
        expiresAt: check.expiresAt || null,
      };
    }

    const allValid = Object.values(platforms).every((p) => p.valid);

    return {
      status: allValid ? 'healthy' : 'degraded',
      platforms,
    };
  }

  // Alias for backward compatibility with tests
  healthCheck() {
    return this.getHealth();
  }
}

import { CloakBrowser } from './cloak-browser.js';
import { EncryptionService } from '../services/encryption-service.js';
import { SessionManager } from '../../shared/services/session/index.js';
import {
  WANTED_HOME_URL,
  WANTED_LOGIN_URL,
  WANTED_PROFILE_API_URL,
  DEFAULT_PROFILE_DIR,
  DEFAULT_BACKOFF_MS,
  WANTED_LOGIN_ERRORS,
  sleep,
  createSessionError,
  isTimeoutError,
  isWafBlocked,
  isCaptchaDetected,
  isAuthCookie,
  cookiesToHeader,
  maskEmail,
  buildSessionStateExpression,
  buildCredentialFillExpression,
  readJsonSafely,
} from './wanted-login-flow-helpers.js';

function createOptionalEncryptionService(env, provided) {
  if (provided) return provided;
  if (!env?.SESSION_ENCRYPTION_KEY) return null;
  return new EncryptionService({ key: env.SESSION_ENCRYPTION_KEY });
}

export class WantedLoginFlow {
  constructor(options = {}) {
    this.env = options.env ?? process.env;
    this.browserFactory =
      options.browserFactory ?? (() => new CloakBrowser({ fetchImpl: options.browserFetchImpl }));
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.sessionManager = options.sessionManager ?? SessionManager;
    this.sleep = options.sleep ?? sleep;
    this.random = options.random ?? Math.random;
    this.profileDir = options.profileDir ?? DEFAULT_PROFILE_DIR;
    this.encryptionService = createOptionalEncryptionService(this.env, options.encryptionService);
  }

  async execute() {
    const email = this.env.WANTED_EMAIL;
    const password = this.env.WANTED_PASSWORD;

    if (!email || !password) {
      throw createSessionError(
        WANTED_LOGIN_ERRORS.LOGIN_FAILED,
        'WANTED_EMAIL and WANTED_PASSWORD are required'
      );
    }

    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.#runAttempt({ attempt, email, password });
      } catch (error) {
        lastError = this.#normalizeError(error);
        if (!this.#isRetryable(lastError) || attempt >= 3) {
          throw lastError;
        }
        await this.sleep(this.#calculateBackoff(attempt));
      }
    }

    throw lastError;
  }

  async #runAttempt({ attempt, email, password }) {
    const browserClient = this.browserFactory();
    const browser = await browserClient.launch({
      timezone: 'Asia/Seoul',
      locale: 'ko-KR',
      profileDir: this.profileDir,
      humanize: true,
      geoip: true,
    });

    try {
      await this.#goto(browser, WANTED_HOME_URL);
      const homeState = await this.#readState(browser);
      this.#guardAgainstBlocks(homeState);

      if (!homeState.loggedIn) {
        await this.#performLogin(browser, { email, password });
      }

      const cookies = await browser.getCookies();
      if (!Array.isArray(cookies) || !cookies.some(isAuthCookie)) {
        throw createSessionError(
          WANTED_LOGIN_ERRORS.LOGIN_FAILED,
          'Wanted auth cookies were not created after login'
        );
      }

      const validation = await this.#validateSession(cookies, email);
      const session = this.#buildSessionData({
        cookies,
        email,
        user: validation.user,
        attempt,
      });

      this.sessionManager.save('wanted', session.storage);
      return session.result;
    } finally {
      await browser.close?.();
    }
  }

  async #performLogin(browser, { email, password }) {
    await this.#goto(browser, WANTED_LOGIN_URL);
    const loginState = await this.#readState(browser);
    this.#guardAgainstBlocks(loginState);

    const fillResult = await browser.evaluate(buildCredentialFillExpression(email, password));
    if (!fillResult?.emailFilled || !fillResult?.passwordFilled) {
      throw createSessionError(
        WANTED_LOGIN_ERRORS.LOGIN_FAILED,
        'Wanted login form could not be filled'
      );
    }

    await this.#humanDelay();
    const postSubmitState = await this.#readState(browser);
    this.#guardAgainstBlocks(postSubmitState);
    if (!postSubmitState.loggedIn && postSubmitState.loginForm) {
      throw createSessionError(
        WANTED_LOGIN_ERRORS.LOGIN_FAILED,
        'Wanted login did not complete successfully'
      );
    }
  }

  async #goto(browser, url) {
    try {
      await browser.goto(url);
      await this.#humanDelay();
    } catch (error) {
      if (isTimeoutError(error)) {
        throw createSessionError(WANTED_LOGIN_ERRORS.TIMEOUT, `Timed out loading ${url}`, error);
      }
      throw error;
    }
  }

  async #readState(browser) {
    const state = (await browser.evaluate(buildSessionStateExpression())) ?? {};
    return {
      loggedIn: Boolean(state.loggedIn),
      captcha: Boolean(state.captcha),
      waf: Boolean(state.waf),
      loginForm: Boolean(state.loginForm),
      url: state.url ?? null,
    };
  }

  #guardAgainstBlocks(state) {
    if (isCaptchaDetected(state)) {
      throw createSessionError(
        WANTED_LOGIN_ERRORS.CAPTCHA_DETECTED,
        'Wanted CAPTCHA detected; manual intervention required'
      );
    }
    if (isWafBlocked(state)) {
      throw createSessionError(
        WANTED_LOGIN_ERRORS.WAF_BLOCKED,
        'Wanted CloudFront challenge detected'
      );
    }
  }

  async #validateSession(cookies, fallbackEmail) {
    if (typeof this.fetchImpl !== 'function') {
      throw createSessionError(
        WANTED_LOGIN_ERRORS.LOGIN_FAILED,
        'Validation fetch implementation is unavailable'
      );
    }

    const cookieHeader = cookiesToHeader(cookies);
    const response = await this.fetchImpl(WANTED_PROFILE_API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Cookie: cookieHeader,
        Origin: 'https://www.wanted.co.kr',
        Referer: 'https://www.wanted.co.kr/',
      },
    });

    const body = await readJsonSafely(response);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        const wafError = body?.message || body?.error || '';
        if (isWafBlocked(null, { message: wafError })) {
          throw createSessionError(
            WANTED_LOGIN_ERRORS.WAF_BLOCKED,
            'Wanted session validation hit CloudFront challenge'
          );
        }
        throw createSessionError(
          WANTED_LOGIN_ERRORS.LOGIN_FAILED,
          'Wanted rejected authenticated profile request'
        );
      }
      throw createSessionError(
        WANTED_LOGIN_ERRORS.LOGIN_FAILED,
        `Wanted session validation failed with status ${response.status}`
      );
    }

    const user = body?.data || body || {};
    if (!user.id && !user.email && !user.name) {
      throw createSessionError(
        WANTED_LOGIN_ERRORS.LOGIN_FAILED,
        'Wanted session validation did not return profile data'
      );
    }

    return {
      user: {
        id: user.id ?? null,
        email: user.email ?? fallbackEmail,
        name: user.name ?? null,
      },
    };
  }

  #buildSessionData({ cookies, email, user, attempt }) {
    const cookieString = cookiesToHeader(cookies);
    const encryptedSession =
      this.encryptionService?.encrypt({
        platform: 'wanted',
        cookieString,
        email: user.email ?? email,
      }) ?? null;

    const storage = {
      token: null,
      email: user.email ?? email,
      cookies,
      cookieString,
      cookieCount: cookies.length,
      encryptedSession,
      authSource: 'cloak-browser',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    return {
      storage,
      result: {
        platform: 'wanted',
        authenticated: true,
        authSource: 'cloak-browser',
        email: user.email ?? email,
        maskedEmail: maskEmail(user.email ?? email),
        user,
        cookies,
        cookieString,
        cookieCount: cookies.length,
        encryptedSession,
        validation: 'profile-api',
        attempt,
      },
    };
  }

  #normalizeError(error) {
    if (error?.code) return error;
    if (isTimeoutError(error))
      return createSessionError(WANTED_LOGIN_ERRORS.TIMEOUT, error.message, error);
    if (isCaptchaDetected(null, error))
      return createSessionError(WANTED_LOGIN_ERRORS.CAPTCHA_DETECTED, error.message, error);
    if (isWafBlocked(null, error))
      return createSessionError(WANTED_LOGIN_ERRORS.WAF_BLOCKED, error.message, error);
    return createSessionError(
      WANTED_LOGIN_ERRORS.LOGIN_FAILED,
      error?.message || 'Wanted login failed',
      error
    );
  }

  #isRetryable(error) {
    return (
      error?.code === WANTED_LOGIN_ERRORS.WAF_BLOCKED || error?.code === WANTED_LOGIN_ERRORS.TIMEOUT
    );
  }

  #calculateBackoff(attempt) {
    return DEFAULT_BACKOFF_MS * 2 ** (attempt - 1) + Math.floor(this.random() * 250);
  }

  async #humanDelay() {
    await this.sleep(300 + Math.floor(this.random() * 500));
  }
}
export const runWantedLoginFlow = (options = {}) => new WantedLoginFlow(options).execute();
export default runWantedLoginFlow;

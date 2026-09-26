import { CloakBrowser } from './cloak-browser.js';
import { SessionManager } from '../../shared/services/session/index.js';
import {
  WANTED_HOME_URL,
  WANTED_LOGIN_URL,
  DEFAULT_PROFILE_DIR,
  WANTED_LOGIN_ERRORS,
  sleep,
  createSessionError,
  isTimeoutError,
  isWafBlocked,
  isCaptchaDetected,
  isAuthCookie,
  buildSessionStateExpression,
  buildCredentialFillExpression,
} from './wanted-login-flow-helpers.js';
import {
  createOptionalEncryptionService,
  normalizeWantedError,
  isWantedRetryableError,
  calculateWantedBackoff,
  validateWantedSession,
  buildWantedSessionData,
} from './wanted-login-flow-session.js';

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

      const validation = await validateWantedSession(this.fetchImpl, cookies, email);
      const session = buildWantedSessionData({
        encryptionService: this.encryptionService,
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

  #normalizeError(error) {
    return normalizeWantedError(error);
  }

  #isRetryable(error) {
    return isWantedRetryableError(error);
  }

  #calculateBackoff(attempt) {
    return calculateWantedBackoff(attempt, this.random);
  }

  async #humanDelay() {
    await this.sleep(300 + Math.floor(this.random() * 500));
  }
}

export const runWantedLoginFlow = (options = {}) => new WantedLoginFlow(options).execute();
export default runWantedLoginFlow;

import CloakBrowser from '../browser/cloak-browser.js';

import { DEFAULT_SESSION_LIFETIME_MS, defaultSleep } from './session-broker-constants.js';

export default class WantedLoginFlow {
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
        (loginEmail, loginPassword) => {
          const emailInput = document.querySelector('input[type="email"]');
          const passwordInput = document.querySelector('input[type="password"]');
          if (emailInput) emailInput.value = loginEmail;
          if (passwordInput) passwordInput.value = loginPassword;
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

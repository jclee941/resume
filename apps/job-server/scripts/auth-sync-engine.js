import fs from 'fs';
import path from 'path';
import { CONFIG, PLATFORMS } from './auth-sync/config.js';
import { loginWanted } from './auth-sync/wanted-login.js';
import { loginManual } from './auth-sync/manual-login.js';
import { loginWithGoogle } from './auth-sync/google-login.js';
import {
  extractCookies,
  getSessionPath,
  loadSessionFromFile,
  saveSessionToFile,
} from './auth-sync/cookie-ops.js';
import { syncToWorker } from './auth-sync-worker.js';
import { launchAuthBrowser } from './auth-sync-browser.js';

export class AuthSync {
  constructor(options = {}) {
    this.headless = options.headless || false;
    this.syncOnly = options.syncOnly || false;
    this.platforms = options.platforms || Object.keys(PLATFORMS);
    this.browser = null;
    this.page = null;
    this.config = { ...CONFIG };
  }

  log(message, type = 'info', platform = null) {
    const timestamp = new Date().toISOString();
    const prefix = { info: 'ℹ️', error: '❌', success: '✅', warn: '⚠️' }[type] || '📝';
    const platformTag = platform ? `[${platform.toUpperCase()}]` : '';
    console.log(`${timestamp} ${prefix} ${platformTag} ${message}`);
  }

  async init() {
    if (this.syncOnly) {
      this.log('Sync-only mode, skipping browser initialization');
      return;
    }
    this.log(`Starting browser (headless: ${this.headless})`);
    const { browser, page } = await launchAuthBrowser(this.headless);
    this.browser = browser;
    this.page = page;
  }

  async loginWanted() {
    return loginWanted(
      this.page,
      {
        ...this.config,
        platform: PLATFORMS.wanted,
        screenshot: this.screenshot.bind(this),
      },
      this.log.bind(this)
    );
  }

  async loginManual(platformKey) {
    return loginManual(
      this.browser,
      this.page,
      {
        ...this.config,
        headless: this.headless,
        platformKey,
        platform: PLATFORMS[platformKey],
      },
      this.log.bind(this)
    );
  }

  async loginWithGoogle(platformKey) {
    // kept for reference, but not used
    return loginWithGoogle(
      this.browser,
      this.page,
      {
        ...this.config,
        platformKey,
        platform: PLATFORMS[platformKey],
        screenshot: this.screenshot.bind(this),
      },
      this.log.bind(this)
    );
  }

  async extractCookies(platformKey) {
    return extractCookies(this.page, {
      ...this.config,
      platformKey,
      platform: PLATFORMS[platformKey],
      syncOnly: this.syncOnly,
      log: this.log.bind(this),
    });
  }

  getSessionPath(platformKey) {
    return getSessionPath(platformKey, this.config);
  }

  loadSessionFromFile(platformKey) {
    return loadSessionFromFile(platformKey, {
      ...this.config,
      log: this.log.bind(this),
    });
  }

  saveSessionToFile(platformKey, session) {
    return saveSessionToFile(platformKey, session, {
      ...this.config,
      log: this.log.bind(this),
    });
  }

  async syncToWorker(session) {
    return syncToWorker(session, this.config, this.log.bind(this));
  }

  async screenshot(name) {
    if (!this.page) return;
    if (!fs.existsSync(this.config.SCREENSHOTS_DIR)) {
      fs.mkdirSync(this.config.SCREENSHOTS_DIR, { recursive: true });
    }
    const filepath = path.join(this.config.SCREENSHOTS_DIR, `${name}-${Date.now()}.png`);
    await this.page.screenshot({ path: filepath, fullPage: true });
    this.log(`Screenshot: ${filepath}`);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('Browser closed');
    }
  }

  async runPlatform(platformKey) {
    const platform = PLATFORMS[platformKey];
    if (!platform) {
      this.log(`Unknown platform: ${platformKey}`, 'error');
      return null;
    }
    this.log(`Processing ${platform.name}`, 'info', platformKey);
    let session;
    if (this.syncOnly) {
      session = await this.extractCookies(platformKey);
    } else {
      let loginSuccess = false;

      if (platform.authMethod === 'direct') {
        loginSuccess = await this.loginWanted();
      } else if (platform.authMethod === 'manual') {
        loginSuccess = await this.loginManual(platformKey);
      } else if (platform.authMethod === 'google') {
        loginSuccess = await this.loginWithGoogle(platformKey);
      }
      if (loginSuccess) {
        session = await this.extractCookies(platformKey);
      }
    }

    if (session) {
      await this.syncToWorker(session);
    }
    return session;
  }

  async run() {
    const results = {};
    try {
      await this.init();
      for (const platformKey of this.platforms) {
        try {
          results[platformKey] = await this.runPlatform(platformKey);
        } catch (error) {
          this.log(`Error: ${error.message}`, 'error', platformKey);
          await this.screenshot(`${platformKey}-error`);
          results[platformKey] = null;
        }
      }
      return results;
    } finally {
      await this.cleanup();
    }
  }
}

export default AuthSync;

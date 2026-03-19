#!/usr/bin/env node

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
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
import { DEFAULT_USER_AGENT } from '../../job-dashboard/src/utils/user-agents.js';

puppeteer.use(StealthPlugin());

class AuthSync {
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
    this.browser = await puppeteer.launch({
      headless: this.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1280,800',
      ],
      defaultViewport: { width: 1280, height: 800 },
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(DEFAULT_USER_AGENT);
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
    });
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
    if (!session || (!session.cookies && !session.cookieString)) {
      return false;
    }
    this.log('Syncing to Worker', 'info', session.platform);
    try {
      const response = await fetch(`${this.config.JOB_WORKER_URL}/api/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Sync-Secret': this.config.AUTH_SYNC_SECRET || '',
        },
        body: JSON.stringify({
          platform: session.platform,
          cookies: session.cookieString || (Array.isArray(session.cookies) ? session.cookies.map((c) => `${c.name}=${c.value}`).join('; ') : session.cookies),
          email: session.email,
          expiresIn: 24 * 60 * 60 * 1000,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        this.log('Synced to Worker', 'success', session.platform);
        return true;
      }
      this.log(`Sync failed: ${result.error || response.status}`, 'error', session.platform);
      return false;
    } catch (error) {
      this.log(`Sync error: ${error.message}`, 'error', session.platform);
      return false;
    }
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

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Multi-Platform Auth Sync Script

Usage:
  node auth-sync.js                      # All platforms (interactive)
  node auth-sync.js --platform wanted    # Specific platform
  node auth-sync.js --platform jobkorea  # JobKorea only
  node auth-sync.js --headless           # Headless mode
  node auth-sync.js --sync-only          # Sync existing sessions only

Platforms: wanted, jobkorea, saramin

Environment Variables:
  WANTED_EMAIL / WANTED_PASSWORD   - Wanted direct login
  GOOGLE_EMAIL / GOOGLE_PASSWORD   - Google OAuth
  JOB_WORKER_URL                   - Worker URL
  AUTH_SYNC_SECRET                 - Sync secret
`);
  process.exit(0);
}
let platforms = Object.keys(PLATFORMS);
const platformIdx = args.indexOf('--platform');
if (platformIdx !== -1 && args[platformIdx + 1]) {
  platforms = [args[platformIdx + 1]];
}
const options = {
  headless: args.includes('--headless'),
  syncOnly: args.includes('--sync-only'),
  platforms,
};
const sync = new AuthSync(options);
sync
  .run()
  .then((results) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 Authentication Sync Results');
    console.log('='.repeat(50));
    for (const [platform, session] of Object.entries(results)) {
      if (session) {
        console.log(
          `✅ ${platform.toUpperCase()}: ${session.email} (expires: ${session.expiresAt})`
        );
      } else {
        console.log(`❌ ${platform.toUpperCase()}: Failed`);
      }
    }
    const successCount = Object.values(results).filter(Boolean).length;
    process.exit(successCount > 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n[FATAL]', error.message);
    process.exit(1);
  });

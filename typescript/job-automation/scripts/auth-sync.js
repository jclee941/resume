#!/usr/bin/env node
/**
 * Multi-Platform Auth Sync Script
 *
 * Supports:
 *   - Wanted: Direct email/password login (automated)
 *   - JobKorea: Manual login required (Google blocks automation)
 *   - Saramin: Manual login required (Google blocks automation)
 *
 * Usage:
 *   node auth-sync.js                      # All platforms
 *   node auth-sync.js --platform wanted    # Specific platform (automated)
 *   node auth-sync.js --platform jobkorea  # Opens browser for manual login
 *   node auth-sync.js --headless           # Headless mode (Wanted only)
 *   node auth-sync.js --sync-only          # Sync existing sessions only
 *
 * Environment:
 *   WANTED_EMAIL / WANTED_PASSWORD   - Wanted direct login
 *   JOB_WORKER_URL                   - Worker URL (default: https://resume.jclee.me/job)
 *   AUTH_SYNC_SECRET                 - Secret for sync endpoint
 *
 * Note: JobKorea/Saramin require manual Google OAuth login due to bot detection.
 *       Run without --headless to open a browser for manual login.
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

puppeteer.use(StealthPlugin());

const CONFIG = {
  // Wanted (direct login) - MUST set via environment variables
  WANTED_EMAIL: process.env.WANTED_EMAIL,
  WANTED_PASSWORD: process.env.WANTED_PASSWORD,
  // Google OAuth (for JobKorea, Saramin) - MUST set via environment variables
  GOOGLE_EMAIL: process.env.GOOGLE_EMAIL,
  GOOGLE_PASSWORD: process.env.GOOGLE_PASSWORD,
  // Worker
  JOB_WORKER_URL: process.env.JOB_WORKER_URL || 'https://resume.jclee.me/job',
  AUTH_SYNC_SECRET: process.env.AUTH_SYNC_SECRET,
  // Paths
  SESSION_DIR: path.join(process.env.HOME || '/tmp', '.opencode/data'),
  SCREENSHOTS_DIR: path.join(__dirname, '../.data/screenshots'),
};

const PLATFORMS = {
  wanted: {
    name: 'Wanted',
    authMethod: 'direct', // Automated email/password login
    urls: {
      login: 'https://id.wanted.jobs/login',
      main: 'https://www.wanted.co.kr',
      profile: 'https://www.wanted.co.kr/profile',
    },
    cookieDomains: ['www.wanted.co.kr', 'id.wanted.jobs', 'wanted.co.kr', 'wanted.jobs'],
    sessionCookie: 'WWW_ONEID_ACCESS_TOKEN',
  },
  jobkorea: {
    name: 'JobKorea',
    authMethod: 'manual', // Manual login required (Google blocks automation)
    urls: {
      login: 'https://www.jobkorea.co.kr/Login/Login_Tot.asp',
      main: 'https://www.jobkorea.co.kr',
      profile: 'https://www.jobkorea.co.kr/User/MyPage',
    },
    cookieDomains: ['www.jobkorea.co.kr', 'jobkorea.co.kr'],
    sessionCookie: 'NET_SessionId',
  },
  saramin: {
    name: 'Saramin',
    authMethod: 'manual', // Manual login required (Google blocks automation)
    urls: {
      login: 'https://www.saramin.co.kr/zf_user/auth',
      main: 'https://www.saramin.co.kr',
      profile: 'https://www.saramin.co.kr/zf_user/mypage',
    },
    cookieDomains: ['www.saramin.co.kr', 'saramin.co.kr'],
    sessionCookie: 'PHPSESSID',
  },
};

class AuthSync {
  constructor(options = {}) {
    this.headless = options.headless || false;
    this.syncOnly = options.syncOnly || false;
    this.platforms = options.platforms || Object.keys(PLATFORMS);
    this.browser = null;
    this.page = null;
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
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1280,800',
      ],
      defaultViewport: { width: 1280, height: 800 },
    });

    this.page = await this.browser.newPage();

    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
    });
  }

  // ============ WANTED (Direct Login) ============
  async loginWanted() {
    const platform = PLATFORMS.wanted;
    this.log('Navigating to login page', 'info', 'wanted');

    await this.page.goto(platform.urls.login, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await this.sleep(2000);

    // Check if already logged in
    const cookies = await this.page.cookies();
    if (cookies.some((c) => c.name === platform.sessionCookie)) {
      this.log('Already logged in', 'success', 'wanted');
      return true;
    }

    // Click "Continue with email" button
    this.log('Clicking email login button', 'info', 'wanted');
    await this.sleep(1000);
    const buttons = await this.page.$$('button, a[role="button"], div[role="button"]');
    for (const btn of buttons) {
      const text = await btn.evaluate((el) => el.textContent?.toLowerCase() || '');
      if (text.includes('email') || text.includes('이메일')) {
        await btn.click();
        await this.sleep(2000);
        break;
      }
    }

    // Enter email
    this.log('Entering email', 'info', 'wanted');
    const emailInput = await this.page.waitForSelector(
      'input[type="email"], input[type="text"][name*="email"], input[placeholder*="이메일"], input[placeholder*="email"]',
      { timeout: 10000 }
    );
    await emailInput.click({ clickCount: 3 });
    await emailInput.type(CONFIG.WANTED_EMAIL, { delay: 30 });
    await this.sleep(500);

    // Click next button
    this.log('Clicking next', 'info', 'wanted');
    const nextButtons = await this.page.$$('button[type="submit"], button');
    for (const btn of nextButtons) {
      const text = await btn.evaluate((el) => el.textContent?.toLowerCase() || '');
      if (
        text.includes('다음') ||
        text.includes('계속') ||
        text.includes('next') ||
        text.includes('이메일로')
      ) {
        await btn.click();
        break;
      }
    }
    await this.sleep(3000);

    // Enter password
    this.log('Entering password', 'info', 'wanted');
    const passwordInput = await this.page.waitForSelector('input[type="password"]', {
      visible: true,
      timeout: 10000,
    });
    await passwordInput.click();
    await passwordInput.type(CONFIG.WANTED_PASSWORD, { delay: 30 });
    await this.sleep(500);

    // Click login button
    this.log('Clicking login', 'info', 'wanted');
    const loginButtons = await this.page.$$('button[type="submit"], button');
    for (const btn of loginButtons) {
      const text = await btn.evaluate((el) => el.textContent?.toLowerCase() || '');
      if (text.includes('로그인') || text.includes('login')) {
        await btn.click();
        break;
      }
    }
    await this.sleep(5000);

    await this.page
      .waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
      .catch(() => {});
    await this.sleep(3000);

    const finalCookies = await this.page.cookies();
    const loggedIn = finalCookies.some((c) => c.name === platform.sessionCookie);

    if (loggedIn) {
      this.log('Login successful', 'success', 'wanted');
      return true;
    } else {
      this.log('Login failed', 'error', 'wanted');
      await this.screenshot('wanted-login-failed');
      return false;
    }
  }

  // ============ MANUAL LOGIN (for JobKorea, Saramin) ============
  async loginManual(platformKey) {
    const platform = PLATFORMS[platformKey];

    if (this.headless) {
      this.log('Manual login requires non-headless mode. Skipping.', 'warn', platformKey);
      this.log('Run without --headless flag to login manually', 'info', platformKey);
      return false;
    }

    this.log('Opening browser for manual login', 'info', platformKey);
    this.log('Please complete the Google OAuth login in the browser', 'info', platformKey);

    try {
      await this.page.goto(platform.urls.login, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    } catch (e) {
      this.log(`Navigation warning: ${e.message}`, 'warn', platformKey);
    }
    await this.sleep(2000);

    // Check if already logged in
    const cookies = await this.page.cookies();
    if (cookies.some((c) => c.name === platform.sessionCookie)) {
      this.log('Already logged in', 'success', platformKey);
      return true;
    }

    // Wait for user to complete manual login
    this.log('Waiting for manual login (max 3 minutes)...', 'info', platformKey);
    this.log('After logging in, the script will automatically continue', 'info', platformKey);

    const startTime = Date.now();
    const timeout = 180000; // 3 minutes

    while (Date.now() - startTime < timeout) {
      await this.sleep(3000);

      // Navigate to profile page to check login status
      try {
        await this.page.goto(platform.urls.profile, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });
      } catch {
        // Ignore navigation errors
      }

      const currentCookies = await this.page.cookies();
      const hasSession = currentCookies.some((c) => c.name === platform.sessionCookie);

      // Also check if we're no longer on the login page
      const currentUrl = this.page.url();
      const notOnLogin = !currentUrl.includes('login') && !currentUrl.includes('auth');

      if (hasSession || (notOnLogin && currentCookies.length > 5)) {
        this.log('Login detected!', 'success', platformKey);
        return true;
      }

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed % 15 === 0) {
        this.log(`Still waiting for login... (${elapsed}s)`, 'info', platformKey);
      }
    }

    this.log('Login timeout - please try again', 'error', platformKey);
    return false;
  }

  // ============ GOOGLE OAUTH (kept for reference, but not used) ============
  async loginWithGoogle(platformKey) {
    const platform = PLATFORMS[platformKey];
    this.log('Navigating to login page', 'info', platformKey);

    try {
      await this.page.goto(platform.urls.login, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    } catch (e) {
      this.log(`Navigation warning: ${e.message}, continuing...`, 'warn', platformKey);
    }
    await this.sleep(3000);

    // Check if already logged in
    const cookies = await this.page.cookies();
    if (cookies.some((c) => c.name === platform.sessionCookie)) {
      this.log('Already logged in', 'success', platformKey);
      return true;
    }

    // Find and click Google OAuth button
    this.log('Looking for Google login button', 'info', platformKey);
    await this.screenshot(`${platformKey}-login-page`);

    let googleClicked = false;

    // Platform-specific selectors
    if (platformKey === 'jobkorea') {
      // JobKorea: Social login buttons are in order: Naver, Kakao, Facebook, Google(4th), Apple
      // Look for links containing "google" in href or onclick
      const links = await this.page.$$('a');
      for (const link of links) {
        const attrs = await link.evaluate((el) => ({
          href: el.href || '',
          onclick: el.getAttribute('onclick') || '',
          class: el.className || '',
        }));
        if (
          attrs.href.includes('google') ||
          attrs.onclick.includes('google') ||
          attrs.onclick.includes('Google')
        ) {
          await link.click();
          googleClicked = true;
          this.log('Clicked Google link (JobKorea)', 'info', platformKey);
          break;
        }
      }

      // Fallback: Find by class pattern (sns login buttons)
      if (!googleClicked) {
        const snsButtons = await this.page.$$(
          '.sns-login a, .social-login a, [class*="sns"] a, [class*="social"] a'
        );
        if (snsButtons.length >= 4) {
          // Google is typically 4th (index 3)
          await snsButtons[3].click();
          googleClicked = true;
          this.log('Clicked 4th social button (likely Google)', 'info', platformKey);
        }
      }
    } else if (platformKey === 'saramin') {
      // Saramin: Look for Google OAuth button
      const buttons = await this.page.$$('button, a');
      for (const btn of buttons) {
        const attrs = await btn.evaluate((el) => ({
          href: el.href || '',
          onclick: el.getAttribute('onclick') || '',
          text: el.textContent || '',
          class: el.className || '',
        }));
        if (
          attrs.href.includes('google') ||
          attrs.onclick.includes('google') ||
          attrs.text.toLowerCase().includes('google') ||
          attrs.class.includes('google')
        ) {
          await btn.click();
          googleClicked = true;
          this.log('Clicked Google button (Saramin)', 'info', platformKey);
          break;
        }
      }
    }

    // Generic fallback: Find images with google in src
    if (!googleClicked) {
      const images = await this.page.$$('img');
      for (const img of images) {
        const src = await img.evaluate((el) => el.src || '');
        if (src.toLowerCase().includes('google')) {
          await img.evaluate((el) => {
            const clickable = el.closest('a') || el.closest('button') || el.parentElement;
            if (clickable) clickable.click();
            else el.click();
          });
          googleClicked = true;
          this.log('Clicked Google button (via image)', 'info', platformKey);
          break;
        }
      }
    }

    // Generic fallback: Find by text content
    if (!googleClicked) {
      const allElements = await this.page.$$("button, a, div[role='button']");
      for (const el of allElements) {
        const text = await el.evaluate((e) => {
          const t = (
            e.textContent ||
            e.alt ||
            e.title ||
            e.getAttribute('aria-label') ||
            ''
          ).toLowerCase();
          return t;
        });
        if (text.includes('google') || text.includes('구글')) {
          await el.click();
          googleClicked = true;
          this.log('Clicked Google button (via text)', 'info', platformKey);
          break;
        }
      }
    }

    if (!googleClicked) {
      this.log('Could not find Google login button', 'error', platformKey);
      await this.screenshot(`${platformKey}-no-google-btn`);
      return false;
    }

    // Wait for and handle Google OAuth popup
    this.log('Waiting for Google OAuth popup', 'info', platformKey);

    let googlePage = null;

    // Listen for new pages (popups)
    const popupPromise = new Promise((resolve) => {
      this.browser.once('targetcreated', async (target) => {
        const page = await target.page();
        if (page && target.url().includes('accounts.google.com')) {
          resolve(page);
        }
      });
    });

    // Also check existing pages
    await this.sleep(3000);
    const pages = await this.browser.pages();
    googlePage = pages.find((p) => p.url().includes('accounts.google.com'));

    if (!googlePage) {
      // Check if current page redirected to Google
      if (this.page.url().includes('accounts.google.com')) {
        googlePage = this.page;
      } else {
        // Wait a bit more for popup
        googlePage = await Promise.race([popupPromise, this.sleep(5000).then(() => null)]);
      }
    }

    if (!googlePage) {
      this.log('Google OAuth page not found - popup may be blocked', 'error', platformKey);
      await this.screenshot(`${platformKey}-no-google-popup`);
      return false;
    }

    await googlePage.bringToFront();
    this.log(`Google page URL: ${googlePage.url()}`, 'info', platformKey);

    // Enter Google email
    this.log('Entering Google email', 'info', platformKey);
    try {
      await googlePage.waitForSelector('input[type="email"]', {
        timeout: 15000,
      });
      await googlePage.type('input[type="email"]', CONFIG.GOOGLE_EMAIL, {
        delay: 50,
      });
      await this.sleep(500);

      // Click Next button
      const nextBtn = await googlePage.$('#identifierNext');
      if (nextBtn) {
        await nextBtn.click();
      } else {
        await googlePage.keyboard.press('Enter');
      }
      await this.sleep(4000);

      // Screenshot after email entry
      await googlePage.screenshot({
        path: `${CONFIG.SCREENSHOTS_DIR}/${platformKey}-google-after-email-${Date.now()}.png`,
        fullPage: true,
      });
      this.log('Captured Google page after email entry', 'info', platformKey);
    } catch (e) {
      this.log(`Email entry issue: ${e.message}`, 'warn', platformKey);
      await googlePage
        .screenshot({
          path: `${CONFIG.SCREENSHOTS_DIR}/${platformKey}-google-email-error-${Date.now()}.png`,
          fullPage: true,
        })
        .catch(() => {});
    }

    // Enter Google password
    this.log('Entering Google password', 'info', platformKey);
    try {
      await googlePage.waitForSelector('input[type="password"]', {
        visible: true,
        timeout: 15000,
      });
      await googlePage.type('input[type="password"]', CONFIG.GOOGLE_PASSWORD, {
        delay: 50,
      });
      await this.sleep(500);

      // Click Next button
      const passBtn = await googlePage.$('#passwordNext');
      if (passBtn) {
        await passBtn.click();
      } else {
        await googlePage.keyboard.press('Enter');
      }
      await this.sleep(5000);
    } catch (e) {
      this.log(`Password entry failed: ${e.message}`, 'error', platformKey);
      await this.screenshot(`${platformKey}-google-password-error`);
      return false;
    }

    // Wait for redirect back to original site
    this.log('Waiting for OAuth redirect', 'info', platformKey);
    await this.page.bringToFront();

    // Wait for either navigation or the popup to close
    await Promise.race([
      this.page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }),
      this.sleep(10000),
    ]).catch(() => {});

    await this.sleep(3000);

    // Verify login
    const finalCookies = await this.page.cookies();
    const loggedIn = finalCookies.some((c) => c.name === platform.sessionCookie);

    if (loggedIn) {
      this.log('Login successful', 'success', platformKey);
      return true;
    } else {
      this.log('Login verification failed', 'warn', platformKey);
      await this.screenshot(`${platformKey}-login-result`);
      // Still return true if we got some session cookies
      return finalCookies.length > 5;
    }
  }

  // ============ Cookie Extraction ============
  async extractCookies(platformKey) {
    const platform = PLATFORMS[platformKey];

    if (this.syncOnly) {
      return this.loadSessionFromFile(platformKey);
    }

    this.log('Extracting cookies', 'info', platformKey);

    // Navigate to main site
    await this.page
      .goto(platform.urls.main, { waitUntil: 'networkidle2', timeout: 30000 })
      .catch(() => {});
    await this.sleep(2000);

    // Get cookies from all relevant domains
    const cookieUrls = platform.cookieDomains.map((d) => `https://${d}`);
    const allCookies = await this.page.cookies(...cookieUrls);

    // DEBUG: Log all cookies found
    if (allCookies.length > 0) {
      this.log(
        `All cookies found: ${allCookies
          .map((c) => `${c.name}@${c.domain}`)
          .slice(0, 10)
          .join(', ')}...`,
        'info',
        platformKey
      );
    }

    const relevantCookies = allCookies.filter((c) =>
      platform.cookieDomains.some((d) => {
        const normalizedDomain = d.replace(/^www\./, '');
        return c.domain.endsWith(normalizedDomain) || c.domain === `.${normalizedDomain}`;
      })
    );

    this.log(`Found ${relevantCookies.length} cookies`, 'info', platformKey);

    if (relevantCookies.length === 0) {
      return null;
    }

    const cookieString = relevantCookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const session = {
      platform: platformKey,
      cookies: cookieString,
      email: platform.authMethod === 'google' ? CONFIG.GOOGLE_EMAIL : CONFIG.WANTED_EMAIL,
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    this.saveSessionToFile(platformKey, session);
    this.log(`Extracted ${relevantCookies.length} cookies`, 'success', platformKey);
    return session;
  }

  getSessionPath(platformKey) {
    return path.join(CONFIG.SESSION_DIR, `${platformKey}-session.json`);
  }

  loadSessionFromFile(platformKey) {
    try {
      const filepath = this.getSessionPath(platformKey);
      if (!fs.existsSync(filepath)) {
        throw new Error('Session file not found');
      }

      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

      if (new Date(data.expiresAt) < new Date()) {
        throw new Error('Session expired');
      }

      this.log('Loaded session from file', 'success', platformKey);
      return data;
    } catch (error) {
      this.log(`Failed to load session: ${error.message}`, 'error', platformKey);
      return null;
    }
  }

  saveSessionToFile(platformKey, session) {
    if (!fs.existsSync(CONFIG.SESSION_DIR)) {
      fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
    }
    const filepath = this.getSessionPath(platformKey);
    fs.writeFileSync(filepath, JSON.stringify(session, null, 2));
    this.log(`Session saved to ${filepath}`, 'success', platformKey);
  }

  async syncToWorker(session) {
    if (!session || !session.cookies) {
      return false;
    }

    this.log('Syncing to Worker', 'info', session.platform);

    try {
      const response = await fetch(`${CONFIG.JOB_WORKER_URL}/api/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Sync-Secret': CONFIG.AUTH_SYNC_SECRET || '',
        },
        body: JSON.stringify({
          platform: session.platform,
          cookies: session.cookies,
          email: session.email,
          expiresIn: 24 * 60 * 60 * 1000,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.log('Synced to Worker', 'success', session.platform);
        return true;
      } else {
        this.log(`Sync failed: ${result.error || response.status}`, 'error', session.platform);
        return false;
      }
    } catch (error) {
      this.log(`Sync error: ${error.message}`, 'error', session.platform);
      return false;
    }
  }

  async screenshot(name) {
    if (!this.page) return;

    if (!fs.existsSync(CONFIG.SCREENSHOTS_DIR)) {
      fs.mkdirSync(CONFIG.SCREENSHOTS_DIR, { recursive: true });
    }

    const filepath = path.join(CONFIG.SCREENSHOTS_DIR, `${name}-${Date.now()}.png`);
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

// CLI
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

// Parse --platform flag
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
    console.log('\n' + '='.repeat(50));
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

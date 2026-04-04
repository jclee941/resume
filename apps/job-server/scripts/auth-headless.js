#!/usr/bin/env node
/**
 * Headless Auth Script - Automatic login with provided credentials
 *
 * Usage:
 *   node auth-headless.js jobkorea <username> <password>
 *   node auth-headless.js wanted <email> <password>
 *
 * This script performs automated login using Playwright in headless mode.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  USER_DATA_DIR: path.join(process.env.HOME || '/tmp', '.opencode/browser-data'),
  SESSION_DIR: path.join(process.env.HOME || '/tmp', '.opencode/data'),
};

const PLATFORMS = {
  jobkorea: {
    name: 'JobKorea',
    loginUrl: 'https://www.jobkorea.co.kr/Login/Login_Tot.asp',
    checkUrl: 'https://www.jobkorea.co.kr/User/Mng/Resume/ResumeList',
    selectors: {
      username: '#M_ID',
      password: '#M_PWD',
      submit: '#loginBtn',
    },
    cookieDomains: ['jobkorea.co.kr'],
    successIndicator: '/User/',
  },
  wanted: {
    name: 'Wanted',
    loginUrl: 'https://id.wanted.jobs/login',
    checkUrl: 'https://www.wanted.co.kr/cv/list',
    selectors: {
      email: 'input[type="email"], input[name="email"], #email',
      password: 'input[type="password"], input[name="password"], #password',
      submit: 'button[type="submit"], .login-button, button:has-text("로그인")',
    },
    cookieDomains: ['wanted.co.kr', 'id.wanted.jobs'],
    successIndicator: '/cv/',
  },
};

function log(msg, type = 'info') {
  const prefix = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' }[type] || '📝';
  console.log(`${new Date().toISOString()} ${prefix} ${msg}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function authenticate(platformKey, username, password) {
  const platform = PLATFORMS[platformKey];
  if (!platform) {
    log(`Unknown platform: ${platformKey}`, 'error');
    return null;
  }

  const userDataDir = path.join(CONFIG.USER_DATA_DIR, platformKey);

  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  log(`Launching headless browser for ${platform.name}...`);

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    log(`Navigating to login page: ${platform.loginUrl}`);
    await page.goto(platform.loginUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await sleep(2000);

    log('Filling credentials...');

    // Fill username/email
    if (platformKey === 'jobkorea') {
      await page.fill(platform.selectors.username, username);
      await page.fill(platform.selectors.password, password);
    } else {
      // Wanted
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        '#email',
        '[placeholder*="이메일"]',
        '[placeholder*="email"]',
      ];
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        '#password',
        '[placeholder*="비밀번호"]',
        '[placeholder*="password"]',
      ];

      let filled = false;
      for (const sel of emailSelectors) {
        try {
          await page.waitForSelector(sel, { timeout: 2000 });
          await page.fill(sel, username);
          filled = true;
          log(`Filled email using selector: ${sel}`);
          break;
        } catch {}
      }

      for (const sel of passwordSelectors) {
        try {
          await page.waitForSelector(sel, { timeout: 2000 });
          await page.fill(sel, password);
          filled = true;
          log(`Filled password using selector: ${sel}`);
          break;
        } catch {}
      }
    }

    await sleep(1000);

    log('Submitting login form...');

    // Try to click submit button
    const submitSelectors = [
      'button[type="submit"]',
      '.login-button',
      'button:has-text("로그인")',
      'button:has-text("Login")',
      '.btn-login',
      '#loginBtn',
    ];

    for (const sel of submitSelectors) {
      try {
        await page.click(sel);
        log(`Clicked submit using selector: ${sel}`);
        break;
      } catch {}
    }

    log('Waiting for login to complete...');
    await sleep(5000);

    // Check login status
    log('Verifying login status...');
    await page.goto(platform.checkUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await sleep(3000);

    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes(platform.successIndicator);

    if (isLoggedIn) {
      log('Login successful!', 'success');
    } else {
      log(`Login may have failed. Current URL: ${currentUrl}`, 'warn');
    }

    // Extract cookies
    log('Extracting session cookies...');
    const cookies = await context.cookies();
    const relevantCookies = cookies.filter((c) =>
      platform.cookieDomains.some((d) => c.domain.includes(d))
    );

    if (relevantCookies.length === 0) {
      log('No cookies found!', 'error');
      return null;
    }

    const cookieString = relevantCookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const session = {
      platform: platformKey,
      cookies: relevantCookies,
      cookieString,
      cookieCount: relevantCookies.length,
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Save to file
    if (!fs.existsSync(CONFIG.SESSION_DIR)) {
      fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
    }
    const sessionFile = path.join(CONFIG.SESSION_DIR, `${platformKey}-session.json`);
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
    log(`Saved ${relevantCookies.length} cookies to ${sessionFile}`, 'success');

    return session;
  } catch (e) {
    log(`Error: ${e.message}`, 'error');
    return null;
  } finally {
    await context.close();
    log('Browser closed');
  }
}

// CLI
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(`
Headless Auth - Automated login with credentials

Usage:
  node auth-headless.js <platform> <username/email> <password>

Platforms:
  jobkorea - JobKorea (username: qws941)
  wanted   - Wanted (email: qws941@kakao.com)

Examples:
  node auth-headless.js jobkorea qws941 bingogo1l7
  node auth-headless.js wanted qws941@kakao.com bingogo1l7
`);
  process.exit(0);
}

const [platformKey, username, password] = args;

authenticate(platformKey, username, password)
  .then((session) => {
    if (session) {
      log('Authentication complete!', 'success');
      process.exit(0);
    } else {
      log('Authentication failed', 'error');
      process.exit(1);
    }
  })
  .catch((e) => {
    log(`Fatal error: ${e.message}`, 'error');
    process.exit(1);
  });

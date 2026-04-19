import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { dirname } from 'path';
import { SESSION_PATH, SARAMIN_URLS, parseCookieString } from './constants.js';

export async function initBrowser() {
  this.browser = await chromium.launch({
    headless: this.headless,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await this.browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1280, height: 800 },
  });

  if (existsSync(SESSION_PATH)) {
    const session = JSON.parse(readFileSync(SESSION_PATH, 'utf-8'));

    let cookiesToAdd = [];
    if (session.cookies) {
      if (Array.isArray(session.cookies)) {
        cookiesToAdd = session.cookies;
      } else if (typeof session.cookies === 'string') {
        cookiesToAdd = parseCookieString(session.cookies);
      }
    } else if (session.cookieString) {
      cookiesToAdd = parseCookieString(session.cookieString);
    }

    if (cookiesToAdd.length > 0) {
      await context.addCookies(cookiesToAdd);
      console.log(`✅ Loaded ${cookiesToAdd.length} cookies from session`);
    }
  }

  this.page = await context.newPage();
  return this;
}

export async function checkLogin() {
  await this.page.goto(SARAMIN_URLS.resumeList, {
    waitUntil: 'load',
  });

  return !this.page.url().includes('/login');
}

export async function waitForManualLogin() {
  await this.page.goto(SARAMIN_URLS.login, { waitUntil: 'load' });

  console.log('Please login manually in the browser window...');

  await this.page.waitForURL('**/zf_user/**', { timeout: 300000 });

  const cookies = await this.page.context().cookies();
  const fs = await import('fs/promises');
  await fs.mkdir(dirname(SESSION_PATH), { recursive: true });
  await fs.writeFile(SESSION_PATH, JSON.stringify({ cookies }, null, 2));

  console.log('Login successful, session saved.');
  return true;
}

import { launchStealthBrowser } from '../crawlers/browser-utils.js';
import { SessionManager } from '../shared/services/session/index.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export async function findByText(tag, text, cssAlternative = null) {
  if (cssAlternative) {
    const el = await this.page.$(cssAlternative);
    if (el) return el;
  }

  const handle = await this.page.evaluateHandle(
    (tagName, searchText) => {
      const elements = document.querySelectorAll(tagName);
      for (const el of elements) {
        if (el.textContent && el.textContent.includes(searchText)) {
          return el;
        }
      }
      return null;
    },
    tag,
    text
  );

  const element = handle.asElement();
  if (!element) {
    await handle.dispose();
    return null;
  }
  return element;
}

export async function findElementWithText(text) {
  return this.findByText('*', text);
}

export async function initBrowser() {
  const { browser, page } = await launchStealthBrowser();
  this.browser = browser;
  this.page = page;

  if (this.config.cookies) {
    await this.loadCookies(this.config.cookies);
  }

  const platformDomains = {
    wanted: '.wanted.co.kr',
    jobkorea: '.jobkorea.co.kr',
    saramin: '.saramin.co.kr',
  };

  for (const [platform, domain] of Object.entries(platformDomains)) {
    try {
      let session = SessionManager.load(platform);

      if (!session?.cookies && !session?.cookieString) {
        const legacyFile = join(homedir(), '.opencode', 'data', `${platform}-session.json`);
        if (existsSync(legacyFile)) {
          try {
            const legacyData = JSON.parse(readFileSync(legacyFile, 'utf-8'));
            if (legacyData?.cookies || legacyData?.cookieString) {
              session = legacyData;
              this.logger.info(`📂 ${platform}: loaded from legacy session file`);
            }
          } catch (e) {
            this.logger.error('Failed to parse legacy session file:', e);
          }
        }
      }

      if (session?.cookies || session?.cookieString) {
        if (typeof session.cookies === 'string') {
          await this.loadCookies(session.cookies, domain);
          this.logger.info(`✅ ${platform} session cookies loaded`);
        } else if (Array.isArray(session.cookies)) {
          await this.loadCookies(session.cookies);
          this.logger.info(
            `✅ ${platform} session cookies loaded (${session.cookies.length} cookies)`
          );
        } else if (session.cookieString) {
          await this.loadCookies(session.cookieString, domain);
          this.logger.info(`✅ ${platform} session cookies loaded (from cookieString)`);
        }
      } else {
        this.logger.info(`⚠️ ${platform}: no valid session found`);
      }
    } catch (e) {
      this.logger.info(`⚠️ ${platform}: failed to load cookies - ${e.message}`);
    }
  }

  return this;
}

export async function loadCookies(cookies, domain = '.wanted.co.kr') {
  if (typeof cookies === 'string') {
    const cookieList = cookies
      .split(';')
      .map((c) => {
        const [name, ...rest] = c.trim().split('=');
        return { name: name.trim(), value: rest.join('='), domain, path: '/' };
      })
      .filter((c) => c.name);
    await this.page.setCookie(...cookieList);
  } else if (Array.isArray(cookies)) {
    await this.page.setCookie(...cookies);
  }
}

export async function closeBrowser() {
  if (this.browser) {
    await this.browser.close();
    this.browser = null;
    this.page = null;
  }
}

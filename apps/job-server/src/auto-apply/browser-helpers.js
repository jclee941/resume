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

  // Wanted: set OneID token via CDP as HttpOnly cookie.
  // The Chaos API applications endpoint requires HttpOnly cookies that
  // page.setCookie() cannot set. Use CDP Network.setCookie instead.
  await mintAndSetWantedToken.call(this);

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

/**
 * Mint a fresh OneID token and inject it via CDP as an HttpOnly cookie.
 * This is required because the Wanted Chaos API /applications/v1 endpoint
 * rejects requests where WWW_ONEID_ACCESS_TOKEN is not set as HttpOnly.
 */
async function mintAndSetWantedToken() {
  const email = process.env.WANTED_EMAIL;
  const password = process.env.WANTED_PASSWORD;
  const clientId = process.env.WANTED_ONEID_CLIENT_ID;

  if (!email || !password || !clientId) {
    this.logger.info('⚠️ wanted: OneID credentials not available for CDP token injection');
    return;
  }

  try {
    const response = await fetch('https://id-api.wanted.co.kr/v1/auth/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: 'https://id.wanted.co.kr',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'oneid-agent': 'web',
      },
      body: JSON.stringify({
        grant_type: 'password',
        email,
        password,
        client_id: clientId,
        beforeUrl: 'https://www.wanted.co.kr/',
        stay_signed_in: true,
      }),
    });

    if (!response.ok) {
      this.logger.info('⚠️ wanted: OneID token mint failed (' + response.status + ')');
      return;
    }

    const payload = await response.json();
    const token = payload?.token;
    if (!token) {
      this.logger.info('⚠️ wanted: OneID response missing token');
      return;
    }

    const cdp = await this.page.createCDPSession();
    await cdp.send('Network.setCookie', {
      name: 'WWW_ONEID_ACCESS_TOKEN',
      value: token,
      domain: '.wanted.co.kr',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    });
    await cdp.detach();

    // Navigate to wanted.co.kr to activate the cookie and build full cookie jar
    await this.page.goto('https://www.wanted.co.kr/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    this.logger.info('✅ wanted: OneID token set via CDP (HttpOnly)');
  } catch (e) {
    this.logger.info('⚠️ wanted: CDP token injection failed - ' + e.message);
  }
}

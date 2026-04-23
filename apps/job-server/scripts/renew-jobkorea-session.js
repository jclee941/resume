#!/usr/bin/env node
/**
 * Renew JobKorea session via stealth Puppeteer login.
 * Uses fallback selectors and CAPTCHA-aware login verification.
 * Requires: JOBKOREA_EMAIL, JOBKOREA_PASSWORD, PUPPETEER_EXECUTABLE_PATH
 */
import { withStealthBrowser } from '../src/crawlers/browser-utils.js';
import SessionManager from '../src/shared/services/session/session-manager.js';
import {
  buildCookieString,
  clickVisibleSubmit,
  defaultSessionFile as sessionFile,
  fillLoginForm,
  handleCaptchaIfNeeded,
  isLoggedIn,
  maybeUseExistingSession,
  savePlatformSession,
  sleep,
  verifyAuthenticatedSession,
  waitForLoginConfirmation,
} from './jobkorea-session/index.js';

const email = process.env.JOBKOREA_EMAIL;
const password = process.env.JOBKOREA_PASSWORD;
const headless = process.env.HEADLESS !== 'false';
const headlessEnv = process.env.HEADLESS;
const loginUrl = 'https://www.jobkorea.co.kr/Login';
const resumeUrl = `https://www.jobkorea.co.kr/User/Resume/View?rNo=${process.env.JOBKOREA_RNO || '30236578'}`;
const userAgent =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

function log(...args) {
  console.log('[jobkorea-session]', ...args);
}

async function main() {
  if (!email || !password) {
    console.error('[jobkorea-session] JOBKOREA_EMAIL and JOBKOREA_PASSWORD required');
    process.exit(1);
  }

  log('Renewing JobKorea session for:', email);

  if (
    await maybeUseExistingSession({
      sessionFile,
      email,
      verifyAuthenticatedSession,
      resumeUrl,
      userAgent,
      log,
    })
  ) {
    process.exit(0);
  }

  const newSession = await withStealthBrowser(
    async (page) => {
      const existing = SessionManager.load('jobkorea');
      if (existing?.cookies && Array.isArray(existing.cookies)) {
        const valid = existing.cookies.filter((cookie) => cookie.name && cookie.value && cookie.domain);
        if (valid.length) {
          await page.browser().defaultBrowserContext().addCookies(valid);
          log('Injected existing cookies:', valid.length);
        }
      }

      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000);

      if (await isLoggedIn(page)) {
        log('Already logged in via cookies');
      } else {
        await handleCaptchaIfNeeded(page, { log, headlessEnv });
        await fillLoginForm(page, { email, password, log });
        await clickVisibleSubmit(page, { log });
        await waitForLoginConfirmation(page, {
          verifyAuthenticatedSession,
          resumeUrl,
          userAgent,
          headlessEnv,
          log,
        });
        log('Login successful');
      }

      const cookies = await page.browser().defaultBrowserContext().cookies();
      const cookieString = buildCookieString(cookies);
      const session = {
        platform: 'jobkorea',
        email,
        cookies,
        cookieString,
        cookieCount: cookies.length,
        extractedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        timestamp: Date.now(),
      };

      await verifyAuthenticatedSession({ cookieString, resumeUrl, userAgent });
      return session;
    },
    { headless: headless ? 'new' : false }
  );

  SessionManager.save('jobkorea', newSession);
  savePlatformSession(newSession, sessionFile);
  log(`Session renewed: ${newSession.cookieCount} cookies`);
  log(`Expires: ${newSession.expiresAt}`);
}

try {
  await main();
} catch (error) {
  console.error('[jobkorea-session] Renewal failed:', error.message);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Renew JobKorea session via stealth Puppeteer login.
 * Uses fallback selectors and CAPTCHA-aware login verification.
 * Requires: JOBKOREA_EMAIL, JOBKOREA_PASSWORD, PUPPETEER_EXECUTABLE_PATH
 */
import { withStealthBrowser } from '../src/crawlers/browser-utils.js';
import {
buildCookieString,
clickVisibleSubmit,
defaultSessionFile as sessionFile,
  fillLoginForm,
  getActivePage,
handleCaptchaIfNeeded,
isLoggedIn,
jobKoreaSessionTtlMs,
resolveJobKoreaSession,
saveResolvedJobKoreaSession,
sleep,
verifyAuthenticatedSession,
waitForLoginConfirmation,
} from './jobkorea-session/index.js';
import { pickJobKoreaBrowserProfile } from './jobkorea-session/user-agent-pool.js';

const email = process.env.JOBKOREA_EMAIL || process.env.JOBKOREA_USERNAME;
const password = process.env.JOBKOREA_PASSWORD;
const headless = process.env.HEADLESS !== 'false';
const headlessEnv = process.env.HEADLESS;
const loginUrl = 'https://www.jobkorea.co.kr/Login';
const resumeUrl = `https://www.jobkorea.co.kr/User/Resume/View?rNo=${process.env.JOBKOREA_RNO}`;

function log(...args) {
  console.log('[jobkorea-session]', ...args);
}

async function main() {
  if (!email || !password) {
    console.error('[jobkorea-session] JOBKOREA_EMAIL and JOBKOREA_PASSWORD required');
    process.exit(1);
  }

  log('Renewing JobKorea session for:', email);
  const browserProfile = pickJobKoreaBrowserProfile();
  const { userAgent } = browserProfile;

  // Skip HTTP-only verification: it gives false positives (200 OK but actually
  // triggers CAPTCHA in a real browser). Always verify with stealth browser.
  const newSession = await withStealthBrowser(
    async (page) => {
      const existing = resolveJobKoreaSession({ saveResolvedFallback: false });
      if (existing?.cookies && Array.isArray(existing.cookies)) {
        const valid = existing.cookies.filter((cookie) => cookie.name && cookie.value && cookie.domain);
        if (valid.length) {
          // Puppeteer v22+: use page.setCookie(...spread). Map to Puppeteer's CookieParam shape.
          const puppeteerCookies = valid.map((c) => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path || '/',
            expires: typeof c.expires === 'number' ? c.expires : undefined,
            httpOnly: !!c.httpOnly,
            secure: !!c.secure,
            sameSite: c.sameSite || undefined,
          }));
          await page.setCookie(...puppeteerCookies);
          log('Injected existing cookies:', valid.length);
        }
      }

      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000);

      if (await isLoggedIn(page)) {
        log('Already logged in via cookies (browser verified)');
        await page.goto(resumeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(3000);
      } else {
        log('Session expired or CAPTCHA detected, performing fresh login...');

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

      const activePage = await getActivePage(page);
      const cookies = await activePage.cookies('https://www.jobkorea.co.kr', 'https://www.jobkorea.co.kr/');
      const cookieString = buildCookieString(cookies);
      const session = {
        platform: 'jobkorea',
        email,
        cookies,
        cookieString,
        cookieCount: cookies.length,
        extractedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + jobKoreaSessionTtlMs).toISOString(),
        timestamp: Date.now(),
      };

      await verifyAuthenticatedSession({ cookieString, resumeUrl, userAgent });
      return session;
    },
    { headless: headless ? 'new' : false }
  );

  saveResolvedJobKoreaSession(newSession, { filePath: sessionFile });
  log(`Session renewed: ${newSession.cookieCount} cookies`);
  log(`Expires: ${newSession.expiresAt}`);
}

try {
  await main();
} catch (error) {
  console.error('[jobkorea-session] Renewal failed:', error.message);
  process.exitCode = 1;
}

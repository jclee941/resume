#!/usr/bin/env node
/**
 * Renew JobKorea session via stealth Puppeteer login.
 * Uses fallback selectors and CAPTCHA-aware login verification.
 * Requires: JOBKOREA_EMAIL, JOBKOREA_PASSWORD, PUPPETEER_EXECUTABLE_PATH
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { withStealthBrowser } from '../src/crawlers/browser-utils.js';
import SessionManager from '../src/shared/services/session/session-manager.js';

const email = process.env.JOBKOREA_EMAIL;
const password = process.env.JOBKOREA_PASSWORD;
const headless = process.env.HEADLESS !== 'false';
const loginUrl = 'https://www.jobkorea.co.kr/Login';
const resumeUrl = `https://www.jobkorea.co.kr/User/Resume/View?rNo=${process.env.JOBKOREA_RNO || '30236578'}`;
const sessionFile = join(homedir(), '.OpenCode', 'data', 'jobkorea-session.json');

if (!email || !password) {
  console.error('[jobkorea-session] JOBKOREA_EMAIL and JOBKOREA_PASSWORD required');
  process.exit(1);
}

function log(...args) {
  console.log('[jobkorea-session]', ...args);
}

function readJson(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function buildCookieString(cookies = []) {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}

function hasFreshSession(session) {
  if (!session || !session.expiresAt) {
    return false;
  }

  const expiresAt = new Date(session.expiresAt).getTime();
  const hasCookies =
    (Array.isArray(session.cookies) && session.cookies.length > 0) ||
    (typeof session.cookieString === 'string' && session.cookieString.length > 0);

  return Number.isFinite(expiresAt) && expiresAt > Date.now() && hasCookies;
}

function ensureSessionDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function savePlatformSession(data) {
  ensureSessionDir(sessionFile);
  writeFileSync(sessionFile, JSON.stringify(data, null, 2));
}

async function verifyAuthenticatedSession(cookieString) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const response = await fetch(resumeUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Cookie: cookieString,
      Referer: 'https://www.jobkorea.co.kr/',
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    },
    redirect: 'manual',
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (response.status !== 200) {
    throw new Error(`Authenticated resume request failed with status ${response.status}`);
  }

  return response.status;
}

async function getActivePage(page) {
  const pages = await page.browser().pages();
  const openPage = pages.reverse().find((candidate) => !candidate.isClosed());
  if (openPage) {
    return openPage;
  }

  if (!page.isClosed()) {
    return page;
  }

  throw new Error('Browser page closed before login could be confirmed');
}

async function evaluateWithFallback(page, callback) {
  try {
    return await callback(page);
  } catch (error) {
    if (
      !/Target closed|Execution context was destroyed|Cannot find context|detached Frame/i.test(
        error.message || ''
      )
    ) {
      throw error;
    }

    await sleep(1500);
    const fallbackPage = await getActivePage(page);
    return callback(fallbackPage);
  }
}

function isTransientPageError(error) {
  return /Target closed|Execution context was destroyed|Cannot find context|detached Frame/i.test(
    error?.message || ''
  );
}

async function detectCaptcha(page) {
  const activePage = await getActivePage(page);
  return evaluateWithFallback(activePage, (currentPage) => {
    return currentPage.evaluate(() => {
      const text = document.body?.innerText || '';
      const hasText = text.includes('보안인증') || text.includes('reCAPTCHA');
      const hasIframe = Array.from(document.querySelectorAll('iframe')).some((iframe) =>
        /captcha/i.test(iframe.getAttribute('src') || '')
      );

      return hasText || hasIframe;
    });
  });
}

async function isLoggedIn(page) {
  const activePage = await getActivePage(page);
  return evaluateWithFallback(activePage, (currentPage) => {
    return currentPage.evaluate(() => {
      const logoutLink = document.querySelector('a[href*="/Login/Logout"]');
      const userLink = document.querySelector(
        'header a[href*="/User/"], #header a[href*="/User/"], a[href*="/User/"]'
      );
      return Boolean(logoutLink || userLink);
    });
  });
}

async function getDiagnostics(page) {
  const activePage = await getActivePage(page);
  return evaluateWithFallback(activePage, (currentPage) => {
    return currentPage.evaluate(() => ({
      url: location.href,
      title: document.title,
      hasLogoutLink: Boolean(document.querySelector('a[href*="/Login/Logout"]')),
      hasUserLink: Boolean(
        document.querySelector(
          'header a[href*="/User/"], #header a[href*="/User/"], a[href*="/User/"]'
        )
      ),
      hasLoginForm: Boolean(document.querySelector('input[name="M_ID"], input[name="M_PWD"]')),
      bodySnippet: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
    }));
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(promise, timeoutMs, fallbackValue) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleCaptchaIfNeeded(page) {
  const captchaDetected = await detectCaptcha(page);
  if (!captchaDetected) {
    return false;
  }

  if (process.env.HEADLESS === 'true') {
    throw new Error('CAPTCHA/2FA required — re-run with HEADLESS=false for manual solve');
  }

  log('CAPTCHA/2FA detected, waiting up to 120 seconds for manual completion');
  const startedAt = Date.now();
  while (Date.now() - startedAt < 120000) {
    if (await isLoggedIn(page)) {
      log('Manual verification completed');
      return true;
    }

    await sleep(2000);
  }

  throw new Error('CAPTCHA/2FA required but was not completed within 120 seconds');
}

async function waitForLoginConfirmation(page) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    const loggedIn = await withTimeout(
      isLoggedIn(page).catch((error) => {
        if (isTransientPageError(error)) {
          return false;
        }

        throw error;
      }),
      3000,
      false
    );
    if (loggedIn) {
      return true;
    }

    const captchaDetected = await withTimeout(
      detectCaptcha(page).catch((error) => {
        if (isTransientPageError(error)) {
          return false;
        }

        throw error;
      }),
      3000,
      false
    );
    if (captchaDetected) {
      if (process.env.HEADLESS === 'true') {
        throw new Error('CAPTCHA/2FA required — re-run with HEADLESS=false for manual solve');
      }

      log('CAPTCHA/2FA detected, waiting up to 120 seconds for manual completion');
      const manualStartedAt = Date.now();
      while (Date.now() - manualStartedAt < 120000) {
        const manuallyLoggedIn = await withTimeout(
          isLoggedIn(page).catch(() => false),
          3000,
          false
        );
        if (manuallyLoggedIn) {
          return true;
        }

        await sleep(2000);
      }

      throw new Error('CAPTCHA/2FA required but was not completed within 120 seconds');
    }

    const cookieString = await withTimeout(
      buildCookieHeaderFromContext(page).catch(() => ''),
      5000,
      ''
    );
    if (cookieString) {
      try {
        await verifyAuthenticatedSession(cookieString);
        return true;
      } catch {
        // Keep polling until timeout.
      }
    }

    await sleep(2000);
  }

  const diagnostics = await getDiagnostics(page);
  throw new Error(
    `Login sentinel not found within 30s (url=${diagnostics.url}, title=${diagnostics.title}, logout=${diagnostics.hasLogoutLink}, userLink=${diagnostics.hasUserLink}, loginForm=${diagnostics.hasLoginForm}, bodySnippet=${JSON.stringify(diagnostics.bodySnippet)})`
  );
}

async function buildCookieHeaderFromContext(page) {
  const cookies = await page.browser().defaultBrowserContext().cookies();
  return buildCookieString(cookies);
}

async function resolveInput(page, selectors) {
  for (const selector of selectors) {
    const input = await page.$(selector);
    if (input) {
      return input;
    }
  }

  return null;
}

async function fillLoginForm(page) {
  const emailInput = await resolveInput(page, [
    'input[name="M_ID"]',
    'input[type="email"]',
    'input[type="text"][id*="id" i]',
  ]);
  if (!emailInput) {
    throw new Error('JobKorea email input not found');
  }

  await emailInput.click({ clickCount: 3 });
  await emailInput.type(email, { delay: 35 });
  log('Email entered');
  await sleep(500);

  const passwordInput = await resolveInput(page, ['input[name="M_PWD"]', 'input[type="password"]']);
  if (!passwordInput) {
    throw new Error('JobKorea password input not found');
  }

  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(password, { delay: 35 });
  log('Password entered');
  await sleep(500);
}

async function clickVisibleSubmit(page) {
  const candidates = await page.$$('button[type="submit"], input[type="submit"]');
  for (const candidate of candidates) {
    const visible = await candidate.evaluate((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || '1') > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    });

    if (visible) {
      await candidate.click();
      log('Submit clicked');
      await sleep(5000);
      return;
    }
  }

  throw new Error('Visible submit button not found');
}

async function maybeUseExistingSession() {
  const existingFileSession = readJson(sessionFile);
  if (hasFreshSession(existingFileSession)) {
    const cookieString =
      existingFileSession.cookieString ||
      buildCookieString(
        Array.isArray(existingFileSession.cookies) ? existingFileSession.cookies : []
      );

    await verifyAuthenticatedSession(cookieString);
    log(
      `Existing session is still valid (${existingFileSession.cookieCount || 0} cookies, expires ${existingFileSession.expiresAt})`
    );
    return true;
  }

  const unifiedSession = SessionManager.load('jobkorea');
  if (
    hasFreshSession(unifiedSession) &&
    SessionManager.validateSessionContent('jobkorea', unifiedSession).valid
  ) {
    const cookieString =
      unifiedSession.cookieString || buildCookieString(unifiedSession.cookies || []);
    await verifyAuthenticatedSession(cookieString);

    const mirrored = {
      ...unifiedSession,
      platform: 'jobkorea',
      email,
      cookies: Array.isArray(unifiedSession.cookies) ? unifiedSession.cookies : [],
      cookieString,
      cookieCount: unifiedSession.cookieCount ?? (unifiedSession.cookies || []).length,
    };
    savePlatformSession(mirrored);
    log(
      `Unified session is still valid (${mirrored.cookieCount} cookies, expires ${mirrored.expiresAt})`
    );
    return true;
  }

  return false;
}

log('Renewing JobKorea session for:', email);

try {
  if (await maybeUseExistingSession()) {
    process.exit(0);
  }

  const newSession = await withStealthBrowser(
    async (page) => {
      const existing = SessionManager.load('jobkorea');
      if (existing?.cookies && Array.isArray(existing.cookies)) {
        const valid = existing.cookies.filter(
          (cookie) => cookie.name && cookie.value && cookie.domain
        );
        if (valid.length) {
          await page.setCookie(...valid);
          log('Injected existing cookies:', valid.length);
        }
      }

      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000);

      if (await isLoggedIn(page)) {
        log('Already logged in via cookies');
      } else {
        await handleCaptchaIfNeeded(page);
        await fillLoginForm(page);
        await clickVisibleSubmit(page);
        await waitForLoginConfirmation(page);
        log('Login successful');
      }

      const context = page.browser().defaultBrowserContext();
      const cookies = await context.cookies();
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

      await verifyAuthenticatedSession(cookieString);
      return session;
    },
    { headless: headless ? 'new' : false }
  );

  SessionManager.save('jobkorea', newSession);
  savePlatformSession(newSession);
  log(`Session renewed: ${newSession.cookieCount} cookies`);
  log(`Expires: ${newSession.expiresAt}`);
} catch (error) {
  console.error('[jobkorea-session] Renewal failed:', error.message);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * JobKorea automated profile sync with CAPTCHA solving via cliproxy vision.
 *
 * Flow:
 *   1. Launch stealth Chromium
 *   2. Inject existing JobKorea cookies (if any)
 *   3. Visit /Login → solve CAPTCHA via cliproxy → submit form
 *   4. Visit /User/Resume/Edit?RNo=... → confirm session works
 *   5. Save cookies to ~/.OpenCode/data/jobkorea-session.json
 *   6. Run profile-sync (existing handler) using new session
 *
 * Required env: CLIPROXY_API_KEY, JOBKOREA_EMAIL, JOBKOREA_PASSWORD
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { solveJobKoreaCaptcha } from './profile-sync/jobkorea-handler/captcha-solver.js';

const EMAIL = process.env.JOBKOREA_EMAIL;
const PASSWORD = process.env.JOBKOREA_PASSWORD;
const RNO = process.env.JOBKOREA_RNO || '30236578';
const SESSION_PATHS = [
  path.join(os.homedir(), '.OpenCode/data/jobkorea-session.json'),
  path.resolve(process.cwd(), '../..', 'jobkorea-session.json'),
];

if (!EMAIL || !PASSWORD) {
  console.error('Set JOBKOREA_EMAIL and JOBKOREA_PASSWORD');
  process.exit(1);
}
if (!process.env.CLIPROXY_API_KEY) {
  console.error('Set CLIPROXY_API_KEY');
  process.exit(1);
}

const log = (msg) => console.log(`[jk-auto-sync] ${msg}`);

function loadExistingCookies() {
  for (const p of SESSION_PATHS) {
    if (fs.existsSync(p)) {
      try {
        const session = JSON.parse(fs.readFileSync(p, 'utf-8'));
        const cookies = session.cookies || (Array.isArray(session) ? session : []);
        if (cookies.length) return cookies;
      } catch {
        // continue
      }
    }
  }
  return [];
}

function saveCookies(cookies) {
  const session = {
    platform: 'jobkorea',
    cookies,
    cookieString: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
    cookieCount: cookies.length,
    extractedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
  };
  for (const p of SESSION_PATHS) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(session, null, 2));
    log(`Saved session → ${p} (${cookies.length} cookies)`);
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ko-KR', 'ko', 'en-US', 'en'],
    });
  });

  const existingCookies = loadExistingCookies();
  if (existingCookies.length) {
    const normalized = existingCookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain || '.jobkorea.co.kr',
      path: c.path || '/',
      httpOnly: !!c.httpOnly,
      secure: !!c.secure,
      sameSite: c.sameSite === 'Lax' || c.sameSite === 'Strict' || c.sameSite === 'None'
        ? c.sameSite
        : 'Lax',
      expires: typeof c.expires === 'number' ? c.expires : -1,
    }));
    await context.addCookies(normalized);
    log(`Injected ${normalized.length} existing cookies`);
  }

  const page = await context.newPage();

  // 1. Try resume edit directly first; if it works we're done
  await page.goto(`https://www.jobkorea.co.kr/User/Resume/Edit?RNo=${RNO}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  log(`Initial URL: ${page.url()}`);
  if (!page.url().includes('/Login')) {
    log('Existing session is still valid — skipping login');
    const cookies = await context.cookies();
    saveCookies(cookies);
    await browser.close();
    return;
  }

  // 2. Need to log in
  log('Session expired or absent — performing login');
  await page.goto('https://www.jobkorea.co.kr/Login', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  // 3. Solve CAPTCHA FIRST (force-fill via JS to bypass visibility heuristics)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const captchaPresent = await page.$('#gtxt, input[name="gtxt"]');
    if (!captchaPresent) {
      log('No CAPTCHA element on page');
      break;
    }
    log(`CAPTCHA detected (attempt ${attempt + 1}/3) — solving via cliproxy vision`);
    const solved = await solveJobKoreaCaptcha(page);
    if (!solved) {
      log('Vision solver failed — refreshing CAPTCHA and retrying');
      await page.click('img[src*="captcha"]').catch(() => {});
      await page.waitForTimeout(1500);
      continue;
    }
    const ok = await page.evaluate((text) => {
      const el = document.querySelector('#gtxt') || document.querySelector('input[name="gtxt"]');
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.focus();
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value === text;
    }, solved.text);
    log(`Filled CAPTCHA "${solved.text}" via ${solved.model} (success: ${ok})`);
    break;
  }

  // 4. Fill credentials AFTER CAPTCHA
  await page.fill('#M_ID, input[name="M_ID"]', EMAIL);
  await page.fill('#M_PWD, input[name="M_PWD"]', PASSWORD);
  log('Filled credentials');

  // 5. Submit — wait for full navigation including network idle
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => {}),
    page.click('#login-form button[type="submit"], button[type="submit"]'),
  ]);
  await page.waitForTimeout(2500);
  log(`Post-login URL: ${page.url()}`);

  // Inspect post-login content for error messages (CAPTCHA mismatch)
  const postLoginCheck = await page.evaluate(() => {
    const body = document.body?.innerText || '';
    const wrongPattern = /\uadf8\ub9bc\ubb38\uc790|\ubcf4\uc548\uc778\uc99d|\uc790\ub3d9\uac00\uc785|incorrect|invalid/i;
    return {
      hasError: wrongPattern.test(body),
      sample: body.slice(0, 300),
    };
  });
  log(`Post-login state: ${JSON.stringify(postLoginCheck).slice(0, 400)}`);

  // 6. Verify by visiting resume edit (use try/catch since some pages abort)
  try {
    await page.goto(`https://www.jobkorea.co.kr/User/Resume/Edit?RNo=${RNO}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  } catch (err) {
    log(`Resume nav error: ${err.message}`);
  }
  log(`Resume URL: ${page.url()}`);
  if (page.url().includes('/Login')) {
    log('Login failed — redirected back to /Login. CAPTCHA likely incorrect.');
    await browser.close();
    process.exit(2);
  }

  const cookies = await context.cookies();
  saveCookies(cookies);
  log(`Login successful — ${cookies.length} cookies saved`);
  await browser.close();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

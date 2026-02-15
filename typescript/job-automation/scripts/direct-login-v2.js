#!/usr/bin/env node
/**
 * Wanted Direct Login Script V2 (Human-like)
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

puppeteer.use(StealthPlugin());

const EMAIL = 'qws941@kakao.com';
const PASSWORD = process.env.WANTED_PASSWORD;
if (!PASSWORD) {
  throw new Error('WANTED_PASSWORD environment variable is not set');
}
const SESSION_FILE = path.join(
  process.env.HOME,
  '.opencode/data/sessions.json',
);
const SCREENSHOT_DIR = '/tmp';

async function sleep(ms) {
  const random = Math.floor(Math.random() * 500);
  return new Promise((resolve) => setTimeout(resolve, ms + random));
}

async function saveSession(cookies, email) {
  const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const session = {
    wanted: {
      cookies: cookieString,
      email: email,
      expires_at: Date.now() + 24 * 60 * 60 * 1000,
      created_at: new Date().toISOString(),
    },
  };

  let existingSessions = {};
  try {
    if (fs.existsSync(SESSION_FILE)) {
      existingSessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    }
  } catch (e) {}

  const mergedSessions = { ...existingSessions, ...session };
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(mergedSessions, null, 2));
  console.log('✅ Session saved to:', SESSION_FILE);
}

async function run() {
  console.log('🚀 Starting Wanted Direct Login V2...');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  let page;

  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // 1. Go to Login
    console.log('📍 Navigating...');
    await page.goto('https://id.wanted.jobs/login', {
      waitUntil: 'networkidle2',
    });
    await sleep(3000);
    await page.screenshot({ path: '/tmp/wanted-v2-01-load.png' });

    // Check title
    const title = await page.title();
    console.log('Page Title:', title);
    if (title.includes('Forbidden') || title.includes('Access Denied')) {
      throw new Error('Blocked by WAF immediately');
    }

    // 1.5 Click "Continue with Email" if present
    console.log('🖱️ Checking for Email button...');
    try {
      const emailBtn = await page.waitForSelector(
        'button[data-testid*="email"], button:has-text("이메일")',
        { timeout: 5000 },
      );
      if (emailBtn) {
        console.log('Found Email button, clicking...');
        await emailBtn.click();
        await sleep(2000);
      }
    } catch (e) {
      console.log(
        'Email button not found, checking if input is already present...',
      );
    }

    // 2. Type Email slowly
    console.log('✏️ Typing email...');
    const emailInput = await page.waitForSelector('input[type="email"]', {
      visible: true,
      timeout: 10000,
    });
    await emailInput.click();
    await sleep(500);

    for (const char of EMAIL) {
      await page.keyboard.type(char, { delay: 100 + Math.random() * 50 });
    }
    await sleep(1000);
    await page.keyboard.press('Enter');

    console.log('⏳ Waiting for password field...');
    await sleep(5000);
    await page.screenshot({ path: '/tmp/wanted-v2-02-email-entered.png' });

    // 3. Type Password slowly
    console.log('✏️ Typing password...');
    const pwInput = await page.waitForSelector('input[type="password"]', {
      visible: true,
    });
    await pwInput.click();
    await sleep(500);

    for (const char of PASSWORD) {
      await page.keyboard.type(char, { delay: 100 + Math.random() * 50 });
    }
    await sleep(1000);
    await page.keyboard.press('Enter');

    console.log('⏳ Waiting for login...');
    await sleep(10000);
    await page.screenshot({ path: '/tmp/wanted-v2-03-after-login.png' });

    // 4. Verify
    const url = page.url();
    console.log('Current URL:', url);

    if (url.includes('wanted.co.kr')) {
      console.log('🎉 Login successful!');
      const cookies = await page.cookies();
      const wantedCookies = cookies.filter((c) => c.domain.includes('wanted'));
      await saveSession(wantedCookies, EMAIL);
    } else {
      console.error('⚠️ Login might have failed. Check screenshot.');
    }
  } catch (e) {
    console.error('❌ Error:', e);
    await page.screenshot({ path: '/tmp/wanted-v2-error.png' });
  } finally {
    await browser.close();
  }
}

run();

#!/usr/bin/env node
/**
 * Wanted Direct Login Script V4.2 (Fixed Syntax)
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

puppeteer.use(StealthPlugin());

const EMAIL = process.env.WANTED_EMAIL || 'qws941@kakao.com';
const PASSWORD = process.env.WANTED_PASSWORD;
if (!PASSWORD) {
  throw new Error('WANTED_PASSWORD environment variable is not set');
}
console.log(`📧 Using email: ${EMAIL}`);
const SESSION_FILE = path.join(process.env.HOME, '.opencode/data/sessions.json');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  } catch {}

  const mergedSessions = { ...existingSessions, ...session };
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(mergedSessions, null, 2));
  console.log('✅ Session saved to:', SESSION_FILE);
}

async function run() {
  console.log('🚀 Starting Wanted Login V4.2...');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Set standard User Agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log('📍 Navigating...');
    await page.goto('https://id.wanted.jobs/login', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    await sleep(3000);

    // 1. Click Email Button
    console.log('🔍 Clicking Email button...');

    try {
      // Use evaluate to find button by text (more robust than $x in some versions)
      const emailBtnFound = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const target = buttons.find(
          (b) => b.innerText.includes('이메일') || b.innerText.includes('Email')
        );
        if (target) {
          target.click();
          return true;
        }
        return false;
      });

      if (emailBtnFound) {
        console.log('✅ Clicked "이메일" button');
        await sleep(2000);
      } else {
        console.log('⚠️ "이메일" button not found, checking if input is already visible...');
      }
    } catch (e) {
      console.log('Error clicking button:', e.message);
    }

    // 2. Input Email
    console.log('✏️ Waiting for email input...');
    const emailInput = await page.waitForSelector('input[type="email"]', {
      visible: true,
      timeout: 10000,
    });
    if (!emailInput) throw new Error('Email input not found');

    await emailInput.type(EMAIL, { delay: 100 });
    await sleep(500);
    await page.keyboard.press('Enter');

    // 3. Input Password
    console.log('⏳ Waiting for password input...');
    const pwInput = await page.waitForSelector('input[type="password"]', {
      visible: true,
      timeout: 10000,
    });
    await sleep(1000);
    await pwInput.type(PASSWORD, { delay: 100 });
    await sleep(500);
    await page.keyboard.press('Enter');

    // 4. Wait for Login
    console.log('🚀 Logging in...');
    await page
      .waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })
      .catch(() => console.log('Navigation timeout, checking URL...'));

    const url = page.url();
    if (url.includes('wanted.co.kr')) {
      console.log('🎉 Login successful!');
      const cookies = await page.cookies();
      const wantedCookies = cookies.filter((c) => c.domain.includes('wanted'));
      await saveSession(wantedCookies, EMAIL);
    } else {
      throw new Error(`Login failed. Current URL: ${url}`);
    }
  } catch (e) {
    console.error('❌ Error:', e);
    await page.screenshot({ path: '/tmp/wanted-v4-error.png' });
  } finally {
    await browser.close();
  }
}

run();

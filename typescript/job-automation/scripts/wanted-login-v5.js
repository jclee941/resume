#!/usr/bin/env node
/**
 * Wanted.co.kr Login Script v5
 * Adaptive login that handles UI changes gracefully
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

puppeteer.use(StealthPlugin());

const EMAIL = process.env.WANTED_EMAIL || 'qws941@kakao.com';
const PASSWORD = process.env.WANTED_PASSWORD;
const JOB_WORKER_URL = process.env.JOB_WORKER_URL || 'https://job.jclee.me';
const AUTH_SYNC_SECRET = process.env.AUTH_SYNC_SECRET;

if (!PASSWORD) {
  console.error('❌ WANTED_PASSWORD is required');
  process.exit(1);
}

const SESSION_DIR = join(homedir(), '.opencode', 'data');
const SESSION_FILE = join(SESSION_DIR, 'wanted-session.json');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function _findAndClick(page, selectors, description) {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        console.log(`✅ Clicked ${description}: ${selector}`);
        return true;
      }
    } catch (_e) {}
  }

  // Try text-based search
  const textPatterns = ['이메일', 'Email', '이메일로 로그인', 'Sign in with email'];
  for (const text of textPatterns) {
    try {
      const element = await page.evaluateHandle((text) => {
        const elements = [...document.querySelectorAll('button, a, span, div[role=button]')];
        return elements.find((el) => el.textContent?.includes(text));
      }, text);
      if (element) {
        await element.click();
        console.log(`✅ Clicked ${description} with text: ${text}`);
        return true;
      }
    } catch (_e) {}
  }

  console.log(`⚠️ Could not find ${description}, continuing...`);
  return false;
}

async function findAndType(page, selectors, value, description) {
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.type(selector, value, { delay: 50 });
      console.log(`✅ Typed in ${description}: ${selector}`);
      return true;
    } catch (_e) {}
  }

  // Try input by type
  try {
    const input = await page.evaluateHandle(() => {
      return document.querySelector('input[type=email], input[type=text]:not([type=password])');
    });
    if (input) {
      await input.type(value, { delay: 50 });
      console.log(`✅ Typed in ${description} (generic input)`);
      return true;
    }
  } catch (_e) {}

  throw new Error(`Could not find ${description}`);
}

async function main() {
  console.log('🚀 Wanted Login v5 - Adaptive Login');
  console.log(`📧 Email: ${EMAIL}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Navigate to login page
    console.log('📍 Navigating to login page...');
    await page.goto('https://id.wanted.jobs/login', {
      waitUntil: 'networkidle2',
    });
    await sleep(2000);

    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/wanted-step1.png' });
    console.log('📸 Step 1 screenshot saved');

    console.log('🔍 Looking for email login button...');
    const emailBtnClicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')];
      const emailBtn = buttons.find(
        (b) => b.textContent?.toLowerCase().includes('email') || b.textContent?.includes('이메일')
      );
      if (emailBtn) {
        emailBtn.click();
        return emailBtn.textContent.trim();
      }
      return null;
    });
    if (emailBtnClicked) {
      console.log(`✅ Clicked: "${emailBtnClicked}"`);
    } else {
      console.log('⚠️ Email button not found, trying direct navigation...');
      await page.goto('https://id.wanted.jobs/login/email', {
        waitUntil: 'networkidle2',
      });
    }

    await sleep(1000);
    await page.screenshot({ path: '/tmp/wanted-step2.png' });

    // Enter email
    console.log('📝 Entering email...');
    await findAndType(
      page,
      [
        'input[type=email]',
        'input[name=email]',
        'input[placeholder*="이메일"]',
        'input[placeholder*="email" i]',
        'input[autocomplete=email]',
        'input:not([type=password])',
      ],
      EMAIL,
      'email input'
    );

    await sleep(500);
    await page.keyboard.press('Enter');
    await sleep(2000);

    await page.screenshot({ path: '/tmp/wanted-step3.png' });

    // Enter password
    console.log('🔑 Entering password...');
    await page.waitForSelector('input[type=password]', { timeout: 10000 });
    await page.type('input[type=password]', PASSWORD, { delay: 50 });

    await sleep(500);
    await page.keyboard.press('Enter');

    console.log('⏳ Waiting for login to complete...');

    // Wait for redirect or cookie
    try {
      await page.waitForNavigation({ timeout: 15000 });
    } catch (_e) {
      // Maybe already redirected
    }

    await sleep(3000);
    await page.screenshot({ path: '/tmp/wanted-step4.png' });

    // Check login success
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    const cookies = await page.cookies();
    const hasAuthCookie = cookies.some(
      (c) => c.name.includes('WWW_') || c.name.includes('_wid') || c.name === 'connect.sid'
    );

    if (!hasAuthCookie && currentUrl.includes('login')) {
      console.log('❌ Login may have failed - checking for errors...');
      const errorText = await page.evaluate(() => {
        const error = document.querySelector('[class*="error"], [class*="Error"], .error-message');
        return error?.textContent || null;
      });
      if (errorText) {
        console.log(`❌ Error: ${errorText}`);
      }
      await page.screenshot({ path: '/tmp/wanted-error.png' });
      throw new Error('Login failed - no auth cookie found');
    }

    // Extract cookies
    const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    // Save session locally
    mkdirSync(SESSION_DIR, { recursive: true });
    const session = {
      platform: 'wanted',
      cookies: cookieString,
      email: EMAIL,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
    console.log(`✅ Session saved to ${SESSION_FILE}`);

    // Sync to Cloudflare Worker
    if (AUTH_SYNC_SECRET && JOB_WORKER_URL) {
      console.log('🔄 Syncing to Cloudflare Worker...');
      try {
        const response = await fetch(`${JOB_WORKER_URL}/api/auth/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Sync-Secret': AUTH_SYNC_SECRET,
          },
          body: JSON.stringify({
            platform: 'wanted',
            cookies: cookieString,
            email: EMAIL,
            expiresIn: 7 * 24 * 60 * 60 * 1000,
          }),
        });

        if (response.ok) {
          console.log('✅ Session synced to Worker!');
        } else {
          console.log(`⚠️ Sync failed: ${response.status}`);
        }
      } catch (_e) {
        console.log(`⚠️ Sync error: ${e.message}`);
      }
    } else {
      console.log('⚠️ AUTH_SYNC_SECRET or JOB_WORKER_URL not set, skipping sync');
    }

    console.log('\n🎉 Login successful!');
    console.log('Cookie count:', cookies.length);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error('❌ Fatal error:', e.message);
  process.exit(1);
});

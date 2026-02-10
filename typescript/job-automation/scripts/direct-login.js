#!/usr/bin/env node
/**
 * Wanted Direct Login Script (Email/Password)
 * Uses puppeteer-extra stealth plugin to bypass CloudFront WAF
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

// Apply stealth plugin
puppeteer.use(StealthPlugin());

// Configuration
const EMAIL = 'qws941@kakao.com';
const PASSWORD = process.env.WANTED_PASSWORD;
if (!PASSWORD) {
  throw new Error('WANTED_PASSWORD environment variable is not set');
}
const SESSION_FILE = path.join(process.env.HOME, '.opencode/data/sessions.json');
const SCREENSHOT_DIR = '/tmp';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveSession(cookies, email, accessToken = null) {
  const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  // If we have an access token, append it to cookies
  let finalCookieString = cookieString;
  if (accessToken) {
    finalCookieString = `WWW_ONEID_ACCESS_TOKEN=${accessToken}; ${cookieString}`;
    console.log('🔑 Access token added to session');
  }

  const session = {
    wanted: {
      cookies: finalCookieString,
      accessToken: accessToken,
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
  } catch {
    console.log('Creating new sessions file');
  }

  const mergedSessions = { ...existingSessions, ...session };

  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(mergedSessions, null, 2));

  console.log('✅ Session saved to:', SESSION_FILE);
  return finalCookieString;
}

async function loginDirect() {
  console.log('🚀 Starting Wanted Direct Login (Stealth Mode)...');
  console.log('📧 Email:', EMAIL);

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1280,720',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  let capturedToken = null;
  page.on('response', async (res) => {
    const setCookie = res.headers()['set-cookie'] || '';
    const match = setCookie.match(/WWW_ONEID_ACCESS_TOKEN=([^;]+)/);
    if (match && !capturedToken) {
      capturedToken = match[1];
      console.log(`🔑 Captured token from ${res.url().substring(0, 50)}...`);
    }
  });

  try {
    console.log('📍 Navigating to Wanted login...');
    await page.goto('https://id.wanted.jobs/login', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(2000);

    // Check WAF
    const title = await page.title();
    if (title.includes('403') || title.includes('Forbidden')) {
      throw new Error('CloudFront WAF blocked access');
    }

    // 2. Click "Email" login button (social login selection screen)
    console.log('🔘 Clicking Email login button...');
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const emailBtn = buttons.find(
          (b) =>
            b.textContent.includes('이메일') ||
            b.textContent.includes('Email') ||
            b.textContent.toLowerCase().includes('email')
        );
        if (emailBtn) emailBtn.click();
      });
      await sleep(1500);
    } catch {
      console.log('ℹ️ Email button not found, checking for email input directly...');
    }

    // 3. Enter Email
    console.log('✏️ Entering Email...');
    const emailInput = await page.waitForSelector('input[type="email"]', {
      visible: true,
      timeout: 10000,
    });
    await emailInput.type(EMAIL, { delay: 50 });
    await page.keyboard.press('Enter');

    // 3. Enter Password
    console.log('✏️ Entering Password...');
    const passwordInput = await page.waitForSelector('input[type="password"]', {
      visible: true,
      timeout: 10000,
    });
    await passwordInput.type(PASSWORD, { delay: 50 });
    await page.keyboard.press('Enter');

    console.log('⏳ Waiting for login...');
    await sleep(5000); // Wait for redirect/auth

    // 4. Verify Login
    // Check for success redirect or profile element
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);

    // Handle potential 2FA or CAPTCHA
    if (currentUrl.includes('captcha') || (await page.$('iframe[src*="recaptcha"]'))) {
      console.warn('⚠️ CAPTCHA detected! Attempting to wait or solve...');
      await sleep(10000);
    }

    // Navigate to profile list to confirm cookie validity
    await page.goto('https://www.wanted.co.kr/cv/list', {
      waitUntil: 'networkidle2',
    });
    await sleep(2000);

    const finalUrl = page.url();
    if (finalUrl.includes('/login')) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'wanted-direct-login-failed.png'),
      });
      throw new Error('Login verification failed - redirected to login page');
    }

    // 5. Extract Cookies and Access Token
    console.log('🍪 Extracting cookies...');
    const cookies = await page.cookies();
    const wantedCookies = cookies.filter(
      (c) => c.domain.includes('wanted.co.kr') || c.domain.includes('wanted.jobs')
    );

    // 6. Extract access token from localStorage/sessionStorage/cookies
    console.log('🔑 Looking for access token...');
    const accessToken = await page.evaluate(() => {
      const sources = [
        () => localStorage.getItem('WWW_ONEID_ACCESS_TOKEN'),
        () => sessionStorage.getItem('WWW_ONEID_ACCESS_TOKEN'),
        () => localStorage.getItem('accessToken'),
        () => localStorage.getItem('access_token'),
        () => sessionStorage.getItem('accessToken'),
        () => {
          const match = document.cookie.match(/WWW_ONEID_ACCESS_TOKEN=([^;]+)/);
          return match ? match[1] : null;
        },
        () => {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.toLowerCase().includes('token')) {
              const val = localStorage.getItem(key);
              if (val && val.length > 20 && val.length < 100) {
                console.log('Found token-like key:', key);
                return val;
              }
            }
          }
          return null;
        },
      ];
      for (const source of sources) {
        try {
          const token = source();
          if (token) return token;
        } catch {}
      }
      return null;
    });

    if (accessToken) {
      console.log(`✅ Found access token: ${accessToken.substring(0, 10)}...`);
    } else {
      console.log('⚠️ No access token found in storage, checking network...');

      // Navigate to trigger an API call and capture token from request
      const tokenFromNetwork = await new Promise(async (resolve) => {
        let foundToken = null;
        const handler = (request) => {
          const headers = request.headers();
          const authHeader = headers['authorization'];
          if (authHeader && authHeader.startsWith('Bearer ')) {
            foundToken = authHeader.replace('Bearer ', '');
          }
          const cookieHeader = headers['cookie'] || '';
          const tokenMatch = cookieHeader.match(/WWW_ONEID_ACCESS_TOKEN=([^;]+)/);
          if (tokenMatch) {
            foundToken = tokenMatch[1];
          }
        };
        page.on('request', handler);

        try {
          await page.goto('https://www.wanted.co.kr/api/chaos/resumes/v1', {
            waitUntil: 'networkidle0',
            timeout: 10000,
          });
        } catch {}

        page.off('request', handler);
        await sleep(1000);
        resolve(foundToken);
      });

      if (tokenFromNetwork) {
        console.log(`✅ Found token from network: ${tokenFromNetwork.substring(0, 10)}...`);
      }
    }

    const finalToken = capturedToken || accessToken || null;

    if (finalToken) {
      console.log(`✅ Using token: ${finalToken.substring(0, 10)}...`);
    } else {
      console.log('⚠️ No access token captured');
    }

    if (wantedCookies.length > 0) {
      console.log(`✅ Got ${wantedCookies.length} Wanted cookies`);
      await saveSession(wantedCookies, EMAIL, finalToken);
      console.log('🎉 Login Success!');
    } else {
      throw new Error('No Wanted cookies found');
    }
  } catch (_error) {
    console.error('❌ Error:', _error.message);
    await page.screenshot({ path: '/tmp/wanted-v4-error.png' });
  } finally {
    await browser.close();
  }
}

loginDirect();

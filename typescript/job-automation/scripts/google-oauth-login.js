#!/usr/bin/env node
/**
 * Wanted Google OAuth Login Script
 * Uses Google App Password for authentication
 * With puppeteer-extra stealth plugin to bypass CloudFront WAF
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

// Apply stealth plugin
puppeteer.use(StealthPlugin());

// Configuration
const GOOGLE_EMAIL = 'qwer941a@gmail.com';
const GOOGLE_APP_PASSWORD = (
  process.env.GOOGLE_APP_PASSWORD || 'pijjtjqoxfpghckk'
).replace(/\s/g, '');
const SESSION_FILE = path.join(
  process.env.HOME,
  '.opencode/data/sessions.json',
);
const SCREENSHOT_DIR = '/tmp';

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
  } catch (e) {
    console.log('No existing sessions file, creating new one');
  }

  const mergedSessions = { ...existingSessions, ...session };

  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(mergedSessions, null, 2));

  console.log('Session saved to:', SESSION_FILE);
  return cookieString;
}

async function loginWithGoogle() {
  console.log('Starting Wanted Google OAuth Login (Stealth Mode)...');
  console.log('Email:', GOOGLE_EMAIL);

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
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  });

  try {
    // Step 1: Go to Wanted login page
    console.log('Navigating to Wanted login...');
    await page.goto('https://id.wanted.jobs/login', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'wanted-01-login-page.png'),
    });

    // Check if we hit CloudFront block (check title, not body content)
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    if (
      pageTitle.includes('403') ||
      pageTitle.includes('Forbidden') ||
      pageTitle.includes('Access Denied')
    ) {
      throw new Error(
        'CloudFront WAF blocked access - stealth may not be working',
      );
    }

    // Step 2: Click Google login button
    console.log('Looking for Google login button...');

    // Wait for page to fully load
    await page.waitForSelector('button, a', { timeout: 10000 });

    // Find Google button by various methods
    let clicked = false;

    // Method 1: data-testid
    try {
      await page.click('[data-testid="google-login"]', { timeout: 3000 });
      clicked = true;
      console.log('Clicked via data-testid');
    } catch {}

    // Method 2: class contains google
    if (!clicked) {
      try {
        const googleBtns = await page.$$(
          '[class*="google"], [class*="Google"]',
        );
        if (googleBtns.length > 0) {
          await googleBtns[0].click();
          clicked = true;
          console.log('Clicked via class selector');
        }
      } catch {}
    }

    // Method 3: aria-label
    if (!clicked) {
      try {
        await page.click('[aria-label*="Google"], [aria-label*="google"]', {
          timeout: 3000,
        });
        clicked = true;
        console.log('Clicked via aria-label');
      } catch {}
    }

    // Method 4: text content
    if (!clicked) {
      try {
        const buttons = await page.$$('button, a');
        for (const btn of buttons) {
          const text = await page.evaluate((el) => el.textContent, btn);
          if (text && text.toLowerCase().includes('google')) {
            await btn.click();
            clicked = true;
            console.log('Clicked via text content');
            break;
          }
        }
      } catch {}
    }

    // Method 5: SVG icon for Google
    if (!clicked) {
      try {
        const svgBtns = await page.$$('button:has(svg), a:has(svg)');
        if (svgBtns.length > 0) {
          // Usually first social login button is Google
          await svgBtns[0].click();
          clicked = true;
          console.log('Clicked first social button (assuming Google)');
        }
      } catch {}
    }

    if (!clicked) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'wanted-error-no-google-btn.png'),
      });
      throw new Error('Google login button not found');
    }

    console.log('Clicked Google login button');
    await sleep(3000);

    // Step 3: Google login page
    console.log('Waiting for Google login page...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'wanted-02-google-page.png'),
    });

    // Enter email
    console.log('Entering Google email...');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.type('input[type="email"]', GOOGLE_EMAIL, { delay: 50 });
    await sleep(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'wanted-03-email-entered.png'),
    });

    // Click Next
    console.log('Clicking Next...');
    await page.click('#identifierNext');
    await sleep(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'wanted-04-after-email.png'),
    });

    // Step 4: Enter password
    console.log('Entering Google password...');
    await page.waitForSelector('input[type="password"]', {
      visible: true,
      timeout: 15000,
    });
    await page.type('input[type="password"]', GOOGLE_APP_PASSWORD, {
      delay: 50,
    });
    await sleep(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'wanted-05-password-entered.png'),
    });

    // Click Next
    console.log('Clicking Sign in...');
    await page.click('#passwordNext');
    await sleep(5000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'wanted-06-after-password.png'),
    });

    // Step 5: Handle potential consent screen
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('consent') || currentUrl.includes('approval')) {
      console.log('Consent screen detected, clicking allow...');
      try {
        await page.click('#submit_approve_access, button[value="accept"]');
        await sleep(3000);
      } catch {
        console.log('No consent button found, continuing...');
      }
    }

    // Step 6: Wait for redirect back to Wanted
    console.log('Waiting for redirect to Wanted...');
    await page.waitForFunction(
      () =>
        window.location.href.includes('wanted.co.kr') ||
        window.location.href.includes('wanted.jobs'),
      { timeout: 30000 },
    );
    await sleep(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'wanted-07-after-login.png'),
    });

    // Step 7: Verify login
    console.log('Verifying login...');
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);

    // Go to profile to verify
    await page.goto('https://www.wanted.co.kr/cv/list', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(2000);

    const verifyUrl = page.url();
    if (verifyUrl.includes('/login')) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'wanted-error-login-failed.png'),
      });
      throw new Error('Login verification failed - redirected to login page');
    }

    // Extract cookies
    console.log('Extracting cookies...');
    const cookies = await page.cookies();
    const wantedCookies = cookies.filter(
      (c) =>
        c.domain.includes('wanted.co.kr') || c.domain.includes('wanted.jobs'),
    );

    console.log(`Got ${wantedCookies.length} Wanted cookies`);

    // Save session
    await saveSession(wantedCookies, GOOGLE_EMAIL);

    // Final screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'wanted-08-success.png'),
    });

    console.log('Login successful!');

    return true;
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'wanted-error-final.png'),
    });
    throw error;
  } finally {
    await browser.close();
  }
}

// Run
loginWithGoogle()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFailed:', error.message);
    console.log('\nCheck screenshots in /tmp/wanted-*.png');
    process.exit(1);
  });

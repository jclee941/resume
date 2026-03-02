#!/usr/bin/env node
/**
 * Wanted Cookie Extractor
 *
 * Usage:
 *   1. Run: node scripts/get-cookies.js
 *   2. Browser opens → Log in to Wanted
 *   3. Cookies auto-saved to session file
 */

import puppeteer from 'puppeteer';
import { SessionManager } from '../src/shared/services/session/index.js';

async function extractCookies() {
  console.log('🚀 Launching browser...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  console.log('📱 Opening Wanted login page...');
  await page.goto('https://www.wanted.co.kr/login', {
    waitUntil: 'networkidle2',
  });

  console.log('\n⏳ Waiting for login...');
  console.log('   Please log in to Wanted in the browser window.');
  console.log('   Cookies will be saved automatically after login.\n');

  // Wait for successful login (redirect to main page or profile)
  await page.waitForFunction(
    () => {
      const url = window.location.href;
      return !url.includes('/login') && !url.includes('/oauth');
    },
    { timeout: 300000 }, // 5 minutes timeout
  );

  console.log('✅ Login detected!');

  // Get all cookies
  const cookies = await page.cookies();

  // Find user info
  let email = 'unknown';
  const airbridge = cookies.find((c) => c.name === 'airbridge_user');
  if (airbridge) {
    try {
      const decoded = JSON.parse(decodeURIComponent(airbridge.value));
      if (decoded.externalUserID) {
        email = `user_${decoded.externalUserID}`;
      }
    } catch {
      /* JSON parse failed - use default email */
    }
  }

  // Save session via SessionManager
  const sessionData = {
    email,
    cookies, // SessionManager expects array of cookies or string?
    // Looking at server.js (api/auth/set), it expects { platform, cookies, email }.
    // But server.js endpoint expects `cookies` as... let's check SessionManager again.
    // SessionManager just saves what it gets.
    // AutoApplier/Crawler usually expects Puppeteer cookie array OR string?
    // wanted-crawler.js likely expects array if using page.setCookie(), or string if headers.
    // Let's look at crawler code if needed. For now, saving array is safer for Puppeteer.
    // BUT `get-cookies.js` previously saved `cookieString`.
    // Let's save BOTH to be safe or check usage.
    // server.js saves payload directly.
    // Let's save object with both.
    cookieString: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
  };

  // Update: SessionManager.save saves to "job-automation-sessions.json" under the platform key.
  // We'll save the array as 'cookies' since Puppeteer likes that, and 'cookieString' for API calls.
  SessionManager.save('wanted', {
    cookies, // Array
    cookieString: sessionData.cookieString,
    email,
    timestamp: Date.now(),
  });

  console.log('\n🎉 Session synced for \'wanted\'');
  console.log(`   Email: ${email}`);

  await browser.close();
  console.log('\n✅ Done! Dashboard and Auto-Applier are now synced.');
}

extractCookies().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

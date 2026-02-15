import puppeteer from 'puppeteer';
import { SessionManager } from '../src/shared/services/session/index.js';
import fs from 'fs';
import path from 'path';

// Manual .env parser since dotenv might not be installed
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
          process.env[key] = value;
        }
      });
      console.log('✅ Loaded .env file manually');
    } else {
      console.log('⚠️ .env file not found at ' + envPath);
    }
  } catch (e) {
    console.error('⚠️ Failed to parse .env:', e.message);
  }
}

loadEnv();

async function login() {
  console.log('🚀 Launching Headless Browser for Login...');
  const browser = await puppeteer.launch({
    headless: 'new', // Use new headless mode
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  // Set real User-Agent to bypass basic WAF
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  );

  // Stealth: Hide webdriver property
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  try {
    console.log('📱 Opening Wanted login page...');
    await page.goto('https://www.wanted.co.kr/login', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    console.log('🔍 Page loaded. Checking content...');
    const title = await page.title();
    console.log(`   Title: ${title}`);

    // Check for Cloudflare Challenge or WAF
    const content = await page.content();
    if (
      content.includes('challenge-platform') ||
      title.includes('Just a moment')
    ) {
      console.warn(
        '⚠️ Cloudflare Challenge detected! Headless login might fail.',
      );
      await page.screenshot({ path: 'login_challenge.png' });
    }

    // Login Logic
    const emailSelector = 'input[type="email"], input[name="email"]';
    try {
      await page.waitForSelector(emailSelector, { timeout: 15000 });
      console.log('📧 Entering email...');
      await page.type(emailSelector, 'qws941@kakao.com', { delay: 100 });
      await page.keyboard.press('Enter');

      await new Promise((r) => setTimeout(r, 2000));

      const passwordSelector = 'input[type="password"]';
      await page.waitForSelector(passwordSelector, { timeout: 15000 });

      const password = process.env.WANTED_PASSWORD;
      if (!password) throw new Error('WANTED_PASSWORD not found in .env');

      console.log('🔑 Entering password...');
      await page.type(passwordSelector, password, { delay: 100 });
      await page.keyboard.press('Enter');

      console.log('⏳ Waiting for navigation...');
      await page
        .waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
        .catch(() => {});
    } catch (e) {
      console.error(`❌ Interaction failed: ${e.message}`);
      await page.screenshot({ path: 'login_error.png' });
    }

    // Save Cookies
    const cookies = await page.cookies();
    if (cookies.length > 0) {
      const cookieString = cookies
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');
      SessionManager.save('wanted', {
        email: 'qws941@kakao.com',
        cookies,
        cookieString,
        timestamp: Date.now(),
      });
      console.log(`✅ Success! Saved ${cookies.length} cookies.`);
    } else {
      console.error('⚠️ No cookies found. Login failed.');
      await page.screenshot({ path: 'login_failed_no_cookies.png' });
    }
  } catch (e) {
    console.error('❌ Critical Error:', e);
  } finally {
    await browser.close();
  }
}

login().catch(console.error);

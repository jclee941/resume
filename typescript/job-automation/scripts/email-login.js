#!/usr/bin/env node
/**
 * Wanted Email Magic Link Login Script
 * Uses Google App Password to read magic link from Gmail
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';

puppeteer.use(StealthPlugin());

// Configuration
const CONFIG = {
  email: 'qwer941a@gmail.com',
  password: (process.env.GOOGLE_APP_PASSWORD || 'pijjtjqoxfpghckk').replace(/\s/g, ''),
  sessionFile: path.join(process.env.HOME, '.opencode/data/sessions.json'),
  imap: {
    user: 'qwer941a@gmail.com',
    password: (process.env.GOOGLE_APP_PASSWORD || 'pijjtjqoxfpghckk').replace(/\s/g, ''),
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    authTimeout: 10000,
  },
};

const _SCREENSHOT_DIR = '/tmp';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function _getLatestEmailLink() {
  console.log('📧 Connecting to Gmail IMAP...');
  const connection = await imaps.connect(CONFIG.imap);

  await connection.openBox('INBOX');
  const searchCriteria = ['UNSEEN', ['FROM', 'noreply@wanted.co.kr']]; // Adjust sender if needed
  const fetchOptions = {
    bodies: ['HEADER', 'TEXT', ''],
    markSeen: false,
  };

  // Retry looking for email
  for (let i = 0; i < 10; i++) {
    console.log(`🔍 Checking email (attempt ${i + 1}/10)...`);
    const messages = await connection.search(searchCriteria, fetchOptions);

    if (messages.length > 0) {
      console.log('✅ Found email!');
      const message = messages[messages.length - 1]; // Get latest
      const all = _.find(message.parts, { which: '' });
      const id = message.attributes.uid;
      const idHeader = 'Imap-Id: ' + id + '\r\n';

      const parsed = await simpleParser(idHeader + all.body);

      // Extract link using regex
      // Link format usually: https://id.wanted.jobs/verify?token=...
      const linkMatch =
        parsed.text.match(/(https:\/\/id\.wanted\.jobs\/verify\S+)/) ||
        parsed.html.match(/(https:\/\/id\.wanted\.jobs\/verify\S+)/);

      if (linkMatch) {
        // Clean up link (remove quotes, html tags if any)
        const link = linkMatch[1].replace(/["'<>\s]/g, '');
        console.log('🔗 Found Magic Link:', link);
        connection.end();
        return link;
      }
    }

    await sleep(3000);
  }

  connection.end();
  throw new Error('Verification email not found');
}

// Need to fix the search criteria or logic to be more robust
// Wanted sender might be 'noreply@wantedlab.com' or similar
async function getMagicLink() {
  console.log('📧 Connecting to Gmail IMAP...');

  try {
    const connection = await imaps.connect({
      imap: CONFIG.imap,
    });

    await connection.openBox('INBOX');

    // Look for emails from Wanted in the last 5 minutes
    const delay = 5 * 60 * 1000;
    const since = new Date(Date.now() - delay);

    const searchCriteria = [['SINCE', since.toISOString()]];

    const fetchOptions = {
      bodies: ['HEADER', 'TEXT'],
      struct: true,
    };

    console.log('🔍 Waiting for email...');

    // Polling loop
    for (let i = 0; i < 20; i++) {
      await sleep(3000); // Wait 3s

      const messages = await connection.search(searchCriteria, fetchOptions);
      // Filter for Wanted locally to be safe about sender address
      const wantedMessages = messages.filter((msg) => {
        const header = msg.parts.find((p) => p.which === 'HEADER');
        if (!header) return false;
        const from = header.body.from ? header.body.from[0] : '';
        const subject = header.body.subject ? header.body.subject[0] : '';
        return (
          from.includes('wanted') || subject.includes('인증') || subject.includes('Verification')
        );
      });

      if (wantedMessages.length > 0) {
        console.log(`✅ Found ${wantedMessages.length} potential emails`);
        // Get the latest one
        const latest = wantedMessages[wantedMessages.length - 1];

        // Fetch full body
        const _parts = await connection.getParts(latest.attributes.uid, ['TEXT'], {
          markSeen: true,
        });
        // Depending on structure, might be parts[0].body
        // Use simpleParser to be sure if we fetch whole source

        // Let's fetch the WHOLE message for the latest one to parse properly
        const fullMsg = await connection.search([['UID', latest.attributes.uid]], { bodies: [''] });
        const raw = fullMsg[0].parts[0].body;

        const parsed = await simpleParser(raw);
        const text = parsed.text || parsed.html || '';

        // Look for the verification button link
        // Usually https://id.wanted.jobs/verify/... or similar
        // Or "로그인하기" link
        const linkMatch = text.match(/https:\/\/id\.wanted\.jobs\/verify[^\s"']+/);

        if (linkMatch) {
          console.log('🔗 Extracted Link:', linkMatch[0]);
          connection.end();
          return linkMatch[0];
        } else {
          console.log('⚠️ Email found but no link matched in body');
          // console.log(text.substring(0, 200));
        }
      }

      process.stdout.write('.');
    }

    connection.end();
    throw new Error('Timeout waiting for email');
  } catch (_e) {
    console.error('IMAP Error:', e);
    throw e;
  }
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
    if (fs.existsSync(CONFIG.sessionFile)) {
      existingSessions = JSON.parse(fs.readFileSync(CONFIG.sessionFile, 'utf8'));
    }
  } catch (_e) {}

  const mergedSessions = { ...existingSessions, ...session };

  fs.mkdirSync(path.dirname(CONFIG.sessionFile), { recursive: true });
  fs.writeFileSync(CONFIG.sessionFile, JSON.stringify(mergedSessions, null, 2));

  console.log('✅ Session saved to:', CONFIG.sessionFile);
}

async function run() {
  console.log('🚀 Starting Wanted Email Login...');

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

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // 1. Go to Login Page
    console.log('📍 Navigating to Wanted login...');
    await page.goto('https://id.wanted.jobs/login', {
      waitUntil: 'networkidle2',
    });

    // 2. Click "Continue with Email"
    console.log('🖱️ Clicking "Continue with Email"...');
    // The button might have text "이메일로 계속하기" or similar
    const _emailBtnSelector =
      'button[data-testid="email-login"], button:has-text("이메일"), [id*="email"]';

    // Wait and Click
    // Sometimes it's directly an input? No, usually selection first.
    // Based on previous screenshot, there is a list.
    // Try finding by text
    try {
      const buttons = await page.$$('button');
      let clicked = false;
      for (const btn of buttons) {
        const text = await page.evaluate((el) => el.textContent, btn);
        if (text.includes('이메일')) {
          await btn.click();
          clicked = true;
          break;
        }
      }
      if (!clicked) throw new Error('Email button not found');
    } catch (_e) {
      console.log('Fallback selector for email button');
      await page.click('button:last-child'); // Fallback: usually the last option
    }

    // 3. Enter Email
    console.log('✏️ Entering Email...');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', CONFIG.email);
    await page.keyboard.press('Enter');

    console.log('⏳ Waiting for email to be sent...');
    await sleep(3000); // Wait for request to go out

    // Check for success message or change in UI
    // await page.waitForSelector('text=인증 메일을 보냈습니다', { timeout: 5000 }).catch(() => {});

    // 4. Fetch Link from Gmail
    const magicLink = await getMagicLink();

    // 5. Navigate to Magic Link
    console.log('🚀 Navigating to Magic Link...');
    await page.goto(magicLink, { waitUntil: 'networkidle2' });

    // 6. Verify and Extract Cookies
    console.log('🍪 Extracting cookies...');
    await sleep(2000);

    const cookies = await page.cookies();
    const wantedCookies = cookies.filter((c) => c.domain.includes('wanted'));

    if (wantedCookies.length > 0) {
      await saveSession(wantedCookies, CONFIG.email);
      console.log('🎉 Login Success!');
    } else {
      throw new Error('No Wanted cookies found after magic link');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: '/tmp/wanted-email-login-error.png' });
  } finally {
    await browser.close();
  }
}

run();

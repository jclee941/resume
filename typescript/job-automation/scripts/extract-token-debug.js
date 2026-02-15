#!/usr/bin/env node
/**
 * Debug script to find where WWW_ONEID_ACCESS_TOKEN comes from
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const EMAIL = 'qws941@kakao.com';
const PASSWORD = process.env.WANTED_PASSWORD;
if (!PASSWORD) throw new Error('WANTED_PASSWORD required');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function debug() {
  console.log('🔍 Debug: Finding WWW_ONEID_ACCESS_TOKEN source...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,720',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const foundTokens = new Set();
  const tokenLocations = [];

  page.on('request', (req) => {
    const url = req.url();
    const headers = req.headers();

    if (headers['authorization']) {
      tokenLocations.push({
        type: 'Authorization Header',
        url,
        value: headers['authorization'],
      });
    }

    const cookie = headers['cookie'] || '';
    const match = cookie.match(/WWW_ONEID_ACCESS_TOKEN=([^;]+)/);
    if (match) {
      foundTokens.add(match[1]);
      tokenLocations.push({
        type: 'Cookie in Request',
        url: url.substring(0, 80),
        value: match[1],
      });
    }
  });

  page.on('response', async (res) => {
    const headers = res.headers();
    const setCookie = headers['set-cookie'] || '';
    if (setCookie.includes('WWW_ONEID_ACCESS_TOKEN')) {
      const match = setCookie.match(/WWW_ONEID_ACCESS_TOKEN=([^;]+)/);
      if (match) {
        foundTokens.add(match[1]);
        tokenLocations.push({
          type: 'Set-Cookie Response',
          url: res.url().substring(0, 80),
          value: match[1],
        });
      }
    }
  });

  try {
    console.log('1️⃣ Navigate to login...');
    await page.goto('https://id.wanted.jobs/login', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(2000);

    console.log('2️⃣ Screenshot before Email button...');
    await page.screenshot({ path: '/tmp/debug-01-login-page.png' });

    console.log('2️⃣ Click Email button...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) =>
          b.textContent.includes('이메일') ||
          b.textContent.includes('Email') ||
          b.textContent.toLowerCase().includes('email'),
      );
      if (btn) {
        console.log('Found email button:', btn.textContent);
        btn.click();
      } else {
        console.log(
          'No email button found, buttons:',
          Array.from(document.querySelectorAll('button'))
            .map((b) => b.textContent.trim())
            .slice(0, 10),
        );
      }
    });
    await sleep(2000);
    await page.screenshot({ path: '/tmp/debug-02-after-email-btn.png' });

    console.log('3️⃣ Enter credentials...');
    let emailInput =
      (await page.$('input[type="email"]')) ||
      (await page.$('input[name="email"]')) ||
      (await page.$('input[placeholder*="이메일"]')) ||
      (await page.$('input[placeholder*="email" i]'));

    if (!emailInput) {
      await sleep(2000);
      emailInput = await page.waitForSelector(
        'input[type="email"], input[name="email"], input[placeholder*="email" i]',
        {
          visible: true,
          timeout: 10000,
        },
      );
    }
    if (!emailInput) {
      await page.screenshot({ path: '/tmp/debug-03-no-email-input.png' });
      throw new Error('Could not find email input');
    }
    if (!emailInput) {
      emailInput = await page.$('input[placeholder*="이메일"]');
    }
    if (!emailInput) {
      emailInput = await page.$('input[placeholder*="email" i]');
    }
    if (!emailInput) {
      // Wait and try again
      await sleep(2000);
      emailInput = await page.waitForSelector(
        'input[type="email"], input[name="email"], input[placeholder*="email" i]',
        {
          visible: true,
          timeout: 10000,
        },
      );
    }
    if (!emailInput) {
      await page.screenshot({ path: '/tmp/debug-03-no-email-input.png' });
      throw new Error('Could not find email input');
    }
    await emailInput.type(EMAIL, { delay: 50 });
    await page.keyboard.press('Enter');

    const passInput = await page.waitForSelector('input[type="password"]', {
      visible: true,
      timeout: 10000,
    });
    await passInput.type(PASSWORD, { delay: 50 });
    await page.keyboard.press('Enter');

    console.log('4️⃣ Wait for login redirect...');
    await sleep(5000);
    console.log('   Current URL:', page.url());

    console.log('5️⃣ Navigate to www.wanted.co.kr...');
    await page.goto('https://www.wanted.co.kr', { waitUntil: 'networkidle2' });
    await sleep(2000);

    console.log('6️⃣ Navigate to CV list...');
    await page.goto('https://www.wanted.co.kr/cv/list', {
      waitUntil: 'networkidle2',
    });
    await sleep(2000);

    console.log('7️⃣ Extract all storage...');
    const storageData = await page.evaluate(() => {
      const result = {
        localStorage: {},
        sessionStorage: {},
        cookies: document.cookie,
      };

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        result.localStorage[key] = localStorage.getItem(key);
      }

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        result.sessionStorage[key] = sessionStorage.getItem(key);
      }

      return result;
    });

    console.log('\n📦 All cookies from page:');
    const cookies = await page.cookies();
    for (const c of cookies) {
      if (
        c.name.toLowerCase().includes('token') ||
        c.name.includes('ACCESS') ||
        c.name.includes('ONEID')
      ) {
        console.log(
          `   ⭐ ${c.name} = ${c.value.substring(0, 30)}... (domain: ${c.domain})`,
        );
      }
    }

    console.log("\n📦 LocalStorage keys with 'token':");
    for (const [key, val] of Object.entries(storageData.localStorage)) {
      if (
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('access') ||
        key.toLowerCase().includes('auth')
      ) {
        console.log(`   ${key} = ${String(val).substring(0, 50)}...`);
      }
    }

    console.log("\n📦 SessionStorage keys with 'token':");
    for (const [key, val] of Object.entries(storageData.sessionStorage)) {
      if (
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('access') ||
        key.toLowerCase().includes('auth')
      ) {
        console.log(`   ${key} = ${String(val).substring(0, 50)}...`);
      }
    }

    console.log("\n📦 Document cookies with 'token':");
    const docCookies = storageData.cookies
      .split(';')
      .filter(
        (c) =>
          c.toLowerCase().includes('token') ||
          c.toLowerCase().includes('access') ||
          c.toLowerCase().includes('oneid'),
      );
    for (const c of docCookies) {
      console.log(`   ${c.trim()}`);
    }

    console.log('\n🔑 Token locations found during requests:');
    for (const loc of tokenLocations) {
      console.log(`   [${loc.type}] ${loc.url}`);
      console.log(`      Value: ${loc.value.substring(0, 50)}...`);
    }

    console.log('\n🎯 Unique tokens found:', [...foundTokens]);

    console.log('\n8️⃣ Make API call to trigger auth...');
    await page
      .goto('https://www.wanted.co.kr/api/chaos/resumes/v1', {
        waitUntil: 'networkidle0',
        timeout: 15000,
      })
      .catch(() => {});
    await sleep(2000);

    console.log('\n🔑 Final token locations:');
    for (const loc of tokenLocations.slice(-5)) {
      console.log(`   [${loc.type}] ${loc.value.substring(0, 40)}...`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debug();

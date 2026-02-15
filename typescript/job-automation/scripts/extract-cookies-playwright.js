#!/usr/bin/env node
import {chromium} from 'playwright';
import {SessionManager} from '../src/shared/services/session/index.js';

const PLATFORMS = {
  wanted: {name: 'Wanted', domain: '.wanted.co.kr', loginUrl: 'https://www.wanted.co.kr'},
  jobkorea: {name: 'JobKorea', domain: '.jobkorea.co.kr', loginUrl: 'https://www.jobkorea.co.kr'},
  remember: {name: 'Remember', domain: '.rememberapp.co.kr', loginUrl: 'https://www.rememberapp.co.kr'},
};

async function extractCookies(platformKey) {
  const platform = PLATFORMS[platformKey];
  if (!platform) {
    console.error(`Unknown platform: ${platformKey}`);
    console.log('Available:', Object.keys(PLATFORMS).join(', '));
    process.exit(1);
  }

  console.log(`\n🔐 Extracting ${platform.name} cookies via browser...`);
  console.log('Opening browser - please log in if needed, then press Enter in terminal.\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(platform.loginUrl, {waitUntil: 'domcontentloaded'});
  
  // Wait for user to log in
  console.log('⏳ Waiting for login... Press Enter when logged in.');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  const cookies = await context.cookies();
  const domainCookies = cookies.filter(c => c.domain.includes(platformKey === 'wanted' ? 'wanted' : platform.domain));

  if (domainCookies.length === 0) {
    console.log('❌ No cookies found. Make sure you are logged in.');
    await browser.close();
    process.exit(1);
  }

  const session = {
    platform: platformKey,
    cookies: domainCookies,
    cookieString: domainCookies.map(c => `${c.name}=${c.value}`).join('; '),
    extractedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  SessionManager.save(platformKey, session);
  
  console.log(`\n✅ Saved ${domainCookies.length} cookies for ${platform.name}`);
  console.log(`   Session file: ~/.OpenCode/data/${platformKey}-session.json`);
  
  // Check for auth tokens
  const authCookies = domainCookies.filter(c => 
    c.name.toLowerCase().includes('token') || 
    c.name.toLowerCase().includes('session') ||
    c.name.toLowerCase().includes('auth')
  );
  if (authCookies.length > 0) {
    console.log(`   Auth cookies: ${authCookies.map(c => c.name).join(', ')}`);
  }

  await browser.close();
}

const platform = process.argv[2] || 'wanted';
extractCookies(platform).catch(console.error);

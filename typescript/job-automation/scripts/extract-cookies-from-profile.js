#!/usr/bin/env node
/**
 * Extract cookies by connecting to existing Chrome profile.
 * This reuses your logged-in Chrome session.
 */
import {chromium} from 'playwright';
import {SessionManager} from '../src/shared/services/session/index.js';
import {homedir} from 'os';
import {join} from 'path';

const PLATFORMS = {
  wanted: {name: 'Wanted', domain: 'wanted.co.kr', testUrl: 'https://www.wanted.co.kr/api/chaos/me'},
  jobkorea: {name: 'JobKorea', domain: 'jobkorea.co.kr', testUrl: 'https://www.jobkorea.co.kr'},
  remember: {name: 'Remember', domain: 'rememberapp.co.kr', testUrl: 'https://www.rememberapp.co.kr'},
};

async function extractCookies(platformKey) {
  const platform = PLATFORMS[platformKey];
  if (!platform) {
    console.error(`Unknown platform: ${platformKey}`);
    process.exit(1);
  }

  const chromeProfile = join(homedir(), '.config/google-chrome');
  console.log(`\n🔐 Extracting ${platform.name} cookies from Chrome profile...`);
  console.log(`   Profile: ${chromeProfile}\n`);

  // Launch with persistent context (uses existing Chrome profile)
  const context = await chromium.launchPersistentContext(chromeProfile, {
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await context.newPage();
  
  // Navigate to trigger cookie loading
  try {
    await page.goto(platform.testUrl, {waitUntil: 'domcontentloaded', timeout: 10000});
  } catch (e) {
    // Ignore navigation errors, we just need the cookies
  }

  const cookies = await context.cookies();
  const domainCookies = cookies.filter(c => c.domain.includes(platform.domain));

  await context.close();

  if (domainCookies.length === 0) {
    console.log('❌ No cookies found. Make sure you are logged in to Chrome.');
    process.exit(1);
  }

  // Check for auth token
  const authCookie = domainCookies.find(c => 
    c.name.includes('TOKEN') || c.name.includes('session') || c.name.includes('auth')
  );

  const session = {
    platform: platformKey,
    cookies: domainCookies,
    cookieString: domainCookies.map(c => `${c.name}=${c.value}`).join('; '),
    extractedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  SessionManager.save(platformKey, session);
  
  console.log(`✅ Saved ${domainCookies.length} cookies for ${platform.name}`);
  if (authCookie) {
    console.log(`   Auth: ${authCookie.name} (${authCookie.value.length} chars)`);
  }
  console.log(`   File: ~/.OpenCode/data/${platformKey}-session.json`);
}

const platform = process.argv[2] || 'wanted';
extractCookies(platform).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

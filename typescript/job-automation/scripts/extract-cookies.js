#!/usr/bin/env node
/**
 * Multi-Platform Cookie Extractor
 *
 * Usage:
 *   node scripts/extract-cookies.js [platform]      # Open browser, wait for manual login
 *   node scripts/extract-cookies.js --all           # All platforms (manual login)
 *   node scripts/extract-cookies.js --from-chrome   # Extract from existing Chrome profile
 *   node scripts/extract-cookies.js --from-chrome jobkorea saramin  # Specific platforms
 *
 * Platforms: wanted, jobkorea, saramin, linkedin, remember
 */

import puppeteer from 'puppeteer';
import {spawn, execSync} from 'child_process';
import {SessionManager} from '../src/shared/services/session/index.js';

const PLATFORMS = {
  wanted: {
    name: 'Wanted',
    loginUrl: 'https://www.wanted.co.kr/login',
    successCheck: url => !url.includes('/login') && !url.includes('/oauth'),
    domain: '.wanted.co.kr',
  },
  jobkorea: {
    name: 'JobKorea',
    loginUrl: 'https://www.jobkorea.co.kr/Login/Login.asp',
    successCheck: url => !url.includes('/Login') && !url.includes('/login'),
    domain: '.jobkorea.co.kr',
  },
  saramin: {
    name: 'Saramin',
    loginUrl: 'https://www.saramin.co.kr/zf_user/auth',
    successCheck: url => !url.includes('/auth') && !url.includes('/login'),
    domain: '.saramin.co.kr',
  },
  linkedin: {
    name: 'LinkedIn',
    loginUrl: 'https://www.linkedin.com/login',
    successCheck: url =>
      !url.includes('/login') &&
      !url.includes('/checkpoint') &&
      (url.includes('/feed') ||
        url.includes('/in/') ||
        url === 'https://www.linkedin.com/'),
    domain: '.linkedin.com',
  },
  remember: {
    name: 'Remember',
    loginUrl: 'https://app.rememberapp.co.kr/login',
    successCheck: url => !url.includes('/login'),
    domain: '.rememberapp.co.kr',
  },
};

const LOGIN_TIMEOUT_MS = 300000;

async function extractCookiesForPlatform(platformKey) {
  const platform = PLATFORMS[platformKey];
  if (!platform) {
    console.error(`Unknown platform: ${platformKey}`);
    console.log(`Available: ${Object.keys(PLATFORMS).join(', ')}`);
    return false;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 ${platform.name} Cookie Extractor`);
  console.log('='.repeat(50));

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: {width: 1280, height: 800},
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    console.log(`📱 Opening ${platform.name} login page...`);
    await page.goto(platform.loginUrl, {waitUntil: 'networkidle2'});

    console.log('\n⏳ Waiting for login...');
    console.log(`   Please log in to ${platform.name} in the browser window.`);
    console.log('   Cookies will be saved automatically after login.\n');

    const startTime = Date.now();
    while (Date.now() - startTime < LOGIN_TIMEOUT_MS) {
      const currentUrl = page.url();
      if (platform.successCheck(currentUrl)) {
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    const finalUrl = page.url();
    if (!platform.successCheck(finalUrl)) {
      console.log(`❌ Login timeout for ${platform.name}`);
      await browser.close();
      return false;
    }

    console.log(`✅ Login detected for ${platform.name}!`);

    const cookies = await page.cookies();
    const email = extractEmailFromCookies(platformKey, cookies);
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    SessionManager.save(platformKey, {
      cookies,
      cookieString,
      email,
      timestamp: Date.now(),
    });

    console.log(`\n🎉 Session saved for '${platformKey}'`);
    console.log(`   Email/User: ${email}`);
    console.log(`   Cookies: ${cookies.length} items`);

    await browser.close();
    return true;
  } catch (err) {
    console.error(`❌ Error for ${platform.name}:`, err.message);
    if (browser) await browser.close();
    return false;
  }
}

function extractEmailFromCookies(platformKey, cookies) {
  if (platformKey === 'wanted') {
    const airbridge = cookies.find(c => c.name === 'airbridge_user');
    if (airbridge) {
      try {
        const decoded = JSON.parse(decodeURIComponent(airbridge.value));
        if (decoded.externalUserID) {
          return `user_${decoded.externalUserID}`;
        }
      } catch {}
    }
  } else if (platformKey === 'linkedin') {
    const liAt = cookies.find(c => c.name === 'li_at');
    if (liAt) {
      return 'linkedin_authenticated';
    }
  } else if (platformKey === 'jobkorea') {
    const member = cookies.find(c => c.name === 'M_ID');
    if (member) {
      return member.value;
    }
  } else if (platformKey === 'saramin') {
    const member = cookies.find(c => c.name === 'sri_m_idx');
    if (member) {
      return `saramin_${member.value}`;
    }
  }
  return 'unknown';
}

const CHROME_PROFILE_PATH =
  process.env.CHROME_PROFILE_PATH ||
  `${process.env.HOME}/.config/google-chrome/Default`;

const CHROME_EXECUTABLE =
  process.env.CHROME_EXECUTABLE || '/usr/bin/google-chrome';

function findAvailablePort(start = 9222) {
  for (let port = start; port < start + 100; port++) {
    try {
      execSync(`lsof -i:${port}`, {stdio: 'ignore'});
    } catch {
      return port;
    }
  }
  return start;
}

async function extractFromChromeProfile(platformKeys = Object.keys(PLATFORMS)) {
  console.log('\n' + '='.repeat(50));
  console.log('🔑 Chrome Profile Cookie Extractor');
  console.log('='.repeat(50));
  console.log(`\n📂 Using profile: ${CHROME_PROFILE_PATH}`);

  const port = findAvailablePort();
  console.log(`🔌 Starting Chrome with debugging port ${port}...`);

  const chromeProcess = spawn(
    CHROME_EXECUTABLE,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${CHROME_PROFILE_PATH.replace('/Default', '')}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
    {
      stdio: 'ignore',
      detached: true,
    }
  );

  await new Promise(r => setTimeout(r, 3000));

  let browser = null;
  try {
    browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${port}`,
      defaultViewport: null,
    });

    console.log('✅ Connected to Chrome\n');

    const results = {};
    for (const platformKey of platformKeys) {
      const platform = PLATFORMS[platformKey];
      if (!platform) {
        console.log(`⚠️  Unknown platform: ${platformKey}`);
        continue;
      }

      console.log(`🔍 Extracting cookies for ${platform.name}...`);

      try {
        const page = await browser.newPage();
        const checkUrl =
          platform.loginUrl.replace(/\/login.*|\/auth.*|\/Login.*/i, '') ||
          platform.loginUrl;
        await page.goto(checkUrl, {waitUntil: 'networkidle2', timeout: 15000});

        const cookies = await page.cookies();
        const relevantCookies = cookies.filter(c =>
          c.domain.includes(platform.domain.replace('.', ''))
        );

        if (relevantCookies.length === 0) {
          console.log(`   ❌ No cookies found for ${platform.domain}`);
          results[platformKey] = false;
          await page.close();
          continue;
        }

        const email = extractEmailFromCookies(platformKey, relevantCookies);
        const cookieString = relevantCookies
          .map(c => `${c.name}=${c.value}`)
          .join('; ');

        SessionManager.save(platformKey, {
          cookies: relevantCookies,
          cookieString,
          email,
          timestamp: Date.now(),
        });

        console.log(`   ✅ Saved ${relevantCookies.length} cookies (${email})`);
        results[platformKey] = true;
        await page.close();
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        results[platformKey] = false;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary');
    console.log('='.repeat(50));
    for (const [key, success] of Object.entries(results)) {
      console.log(`   ${success ? '✅' : '❌'} ${PLATFORMS[key]?.name || key}`);
    }

    await browser.disconnect();
  } catch (err) {
    console.error(`❌ Failed to connect to Chrome: ${err.message}`);
    console.log(
      '\n💡 Make sure Chrome is not already running, or close it first.'
    );
  } finally {
    try {
      process.kill(-chromeProcess.pid);
    } catch {}
  }
}

async function extractAll() {
  console.log('🔄 Extracting cookies for ALL platforms...');
  console.log('   Each platform will open in sequence.\n');

  const results = {};
  for (const platformKey of Object.keys(PLATFORMS)) {
    results[platformKey] = await extractCookiesForPlatform(platformKey);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary');
  console.log('='.repeat(50));
  for (const [key, success] of Object.entries(results)) {
    console.log(`   ${success ? '✅' : '❌'} ${PLATFORMS[key].name}`);
  }
}

async function showStatus() {
  const status = SessionManager.getStatus();
  console.log('\n📊 Current Session Status');
  console.log('='.repeat(40));

  for (const s of status) {
    const icon = s.valid ? '✅' : '❌';
    const expires = s.valid
      ? `(expires in ${Math.round(s.expiresIn / 3600000)}h)`
      : '';
    console.log(`   ${icon} ${s.platform.padEnd(10)} ${expires}`);
  }
}

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Multi-Platform Cookie Extractor

Usage:
  node scripts/extract-cookies.js <platform>       Extract cookies for one platform (manual login)
  node scripts/extract-cookies.js --all            Extract cookies for all platforms (manual login)
  node scripts/extract-cookies.js --from-chrome    Extract from existing Chrome profile (all platforms)
  node scripts/extract-cookies.js --from-chrome <platforms...>  Extract specific platforms from Chrome
  node scripts/extract-cookies.js --status         Show current session status

Platforms:
  ${Object.entries(PLATFORMS)
    .map(([k, v]) => `${k.padEnd(10)} - ${v.name}`)
    .join('\n  ')}

Examples:
  node scripts/extract-cookies.js jobkorea
  node scripts/extract-cookies.js saramin
  node scripts/extract-cookies.js --all
  node scripts/extract-cookies.js --from-chrome
  node scripts/extract-cookies.js --from-chrome jobkorea saramin

Environment:
  CHROME_PROFILE_PATH   Chrome profile directory (default: ~/.config/google-chrome/Default)
  CHROME_EXECUTABLE     Chrome binary path (default: /usr/bin/google-chrome)
`);
  process.exit(0);
}

if (args[0] === '--status') {
  showStatus();
} else if (args[0] === '--from-chrome') {
  const platforms = args.slice(1);
  extractFromChromeProfile(platforms.length > 0 ? platforms : undefined).catch(
    err => {
      console.error('❌ Fatal error:', err.message);
      process.exit(1);
    }
  );
} else if (args[0] === '--all') {
  extractAll().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
} else {
  extractCookiesForPlatform(args[0])
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ Fatal error:', err.message);
      process.exit(1);
    });
}

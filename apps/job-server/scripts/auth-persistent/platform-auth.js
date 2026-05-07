import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { CONFIG, PLATFORMS } from './config.js';
import { log, sleep } from './logging.js';
import { buildSession, saveSession } from './session-persistence.js';

const LOGIN_TIMEOUT_MS = 180000;

async function verifyCurrentLogin(page, platform) {
  const hasUserContent = platform.verifyLogin ? await platform.verifyLogin(page) : true;
  return page.url().includes(platform.successIndicator) && hasUserContent;
}

async function waitForManualLogin(page, platformKey, platform) {
  const startTime = Date.now();

  while (Date.now() - startTime < LOGIN_TIMEOUT_MS) {
    await sleep(3000);

    try {
      await page.goto(platform.checkUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await sleep(2000);

      if (await verifyCurrentLogin(page, platform)) {
        log('Login successful! State saved for future runs.', 'success', platformKey);
        break;
      }
    } catch {
      // Navigation might fail, continue waiting.
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed % 15 === 0) {
      log(`Still waiting... (${elapsed}s)`, 'info', platformKey);
    }
  }
}

async function ensureLoggedIn(page, platformKey, platform) {
  log('Checking login status...', 'info', platformKey);
  await page.goto(platform.checkUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await sleep(3000);

  if (await verifyCurrentLogin(page, platform)) {
    log('Already logged in!', 'success', platformKey);
    return;
  }

  log('Not logged in. Opening login page...', 'info', platformKey);
  await page.goto(platform.loginUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  log('👆 Please complete login in the browser', 'warn', platformKey);
  log('Waiting for login (max 3 minutes)...', 'info', platformKey);
  await waitForManualLogin(page, platformKey, platform);
}

export async function runPlatform(platformKey, reset = false) {
  const platform = PLATFORMS[platformKey];
  if (!platform) {
    log(`Unknown platform: ${platformKey}`, 'error');
    return null;
  }

  const userDataDir = path.join(CONFIG.USER_DATA_DIR, platformKey);

  if (reset && fs.existsSync(userDataDir)) {
    log('Resetting browser state...', 'info', platformKey);
    fs.rmSync(userDataDir, { recursive: true });
  }

  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  log('Launching browser with persistent context...', 'info', platformKey);

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    await ensureLoggedIn(page, platformKey, platform);

    log('Extracting cookies...', 'info', platformKey);
    const session = buildSession(platformKey, await context.cookies(), platform.cookieDomains);

    if (!session) {
      log('No cookies found. Login may have failed.', 'error', platformKey);
      return null;
    }

    saveSession(platformKey, session);
    return session;
  } finally {
    await context.close();
    log('Browser closed', 'info', platformKey);
  }
}

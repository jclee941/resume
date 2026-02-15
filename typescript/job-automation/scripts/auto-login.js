import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import http from 'http';

const SESSION_FILE = path.join(
  process.env.HOME,
  '.claude/data/wanted-session.json',
);
const METRICS_FILE = path.join(
  process.env.HOME,
  '.claude/data/wanted-login-metrics.json',
);
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// Metrics tracking
const metrics = {
  attempts: 0,
  successes: 0,
  failures: 0,
  lastAttempt: null,
  lastSuccess: null,
  lastError: null,
  captchaDetected: 0,
  twoFactorDetected: 0,
};

function loadMetrics() {
  try {
    if (fs.existsSync(METRICS_FILE)) {
      Object.assign(metrics, JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8')));
    }
  } catch {
    /* ignore */
  }
}

function saveMetrics() {
  fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
}

async function sendIpcNotification(message, _isError = false) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      session: 'claude',
      message: `[WANTED] ${message}`,
      addTimestamp: true,
    });

    const req = http.request(
      {
        hostname: 'localhost',
        port: 9003,
        path: '/ipc',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      resolve,
    );

    req.on('error', () => resolve());
    req.write(data);
    req.end();
  });
}

async function detectSecurityChallenge(page) {
  const challenges = {
    captcha: false,
    twoFactor: false,
    blocked: false,
  };

  try {
    // Check for CAPTCHA
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      '.captcha',
      '[class*="captcha"]',
      'img[src*="captcha"]',
    ];

    for (const selector of captchaSelectors) {
      if (await page.$(selector)) {
        challenges.captcha = true;
        break;
      }
    }

    // Check for 2FA
    const twoFactorIndicators = [
      'input[name*="otp"]',
      'input[name*="code"]',
      'input[placeholder*="인증"]',
      'input[placeholder*="코드"]',
      '[class*="verification"]',
      '[class*="two-factor"]',
    ];

    for (const selector of twoFactorIndicators) {
      if (await page.$(selector)) {
        challenges.twoFactor = true;
        break;
      }
    }

    // Check for blocked/rate limited
    const pageContent = await page.content();
    if (
      pageContent.includes('blocked') ||
      pageContent.includes('rate limit') ||
      pageContent.includes('too many requests') ||
      pageContent.includes('차단')
    ) {
      challenges.blocked = true;
    }
  } catch (detectErr) {
    console.log('Challenge detection error:', detectErr.message);
  }

  return challenges;
}

async function autoLogin(retryCount = 0) {
  loadMetrics();
  metrics.attempts++;
  metrics.lastAttempt = new Date().toISOString();

  console.log(
    `🚀 Starting auto login... (attempt ${retryCount + 1}/${MAX_RETRIES})`,
  );

  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== 'false',
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  // Enhanced anti-detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ko-KR', 'ko', 'en-US', 'en'],
    });
    window.chrome = { runtime: {} };
  });

  // Set realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );

  let success = false;
  let errorMessage = null;

  try {
    console.log('📄 Navigating to login page...');
    await page.goto('https://www.wanted.co.kr/login', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Check for security challenges
    const challenges = await detectSecurityChallenge(page);

    if (challenges.captcha) {
      metrics.captchaDetected++;
      throw new Error('CAPTCHA detected - manual intervention required');
    }

    if (challenges.blocked) {
      throw new Error('Access blocked - IP may be rate limited');
    }

    // Wait for login options page
    console.log('⏳ Waiting for login options...');
    await page.waitForSelector('button, a', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Click "이메일로 계속하기" button
    console.log('📧 Clicking email login button...');
    const emailLoginBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(
        document.querySelectorAll('button, a, div[role="button"]'),
      );
      return buttons.find((b) => b.textContent.includes('이메일로 계속하기'));
    });

    if (emailLoginBtn) {
      await emailLoginBtn.click();
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Check for CAPTCHA after clicking
    const postClickChallenges = await detectSecurityChallenge(page);
    if (postClickChallenges.captcha) {
      metrics.captchaDetected++;
      throw new Error('CAPTCHA appeared after interaction');
    }

    // Wait for email input field
    console.log('⏳ Waiting for email input...');
    await page.waitForSelector(
      'input[type="email"], input[type="text"], input[name="email"]',
      { timeout: 10000 },
    );

    console.log('✏️ Entering email...');
    await page.type(
      'input[type="email"], input[type="text"], input[name="email"]',
      'qws941@kakao.com',
      { delay: 50 + Math.random() * 50 },
    );

    // Click next/continue button
    const nextBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(
        (b) =>
          b.textContent.includes('계속') ||
          b.textContent.includes('다음') ||
          b.type === 'submit',
      );
    });
    if (nextBtn) {
      await nextBtn.click();
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Wait for password field
    console.log('⏳ Waiting for password input...');
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    // Check for 2FA
    const prePasswordChallenges = await detectSecurityChallenge(page);
    if (prePasswordChallenges.twoFactor) {
      metrics.twoFactorDetected++;
      await page.screenshot({ path: '/tmp/wanted-2fa-required.png' });
      throw new Error('2FA required - check /tmp/wanted-2fa-required.png');
    }

    console.log('✏️ Entering password...');
    const password = process.env.WANTED_PASSWORD || '';
    if (!password) {
      throw new Error('WANTED_PASSWORD environment variable is required');
    }
    await page.type('input[type="password"]', password, {
      delay: 50 + Math.random() * 50,
    });

    // Click login button
    console.log('🔐 Clicking login button...');
    const loginBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(
        (b) => b.textContent.includes('로그인') || b.type === 'submit',
      );
    });

    if (loginBtn) {
      await loginBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    // Wait for login to complete with fallback
    console.log('⏳ Waiting for login...');
    try {
      await page.waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: 15000,
      });
    } catch {
      console.log('⚠️ Navigation timeout, checking page state...');
    }

    // Additional wait for cookies to be set
    await new Promise((r) => setTimeout(r, 3000));

    // Check for post-login 2FA
    const postLoginChallenges = await detectSecurityChallenge(page);
    if (postLoginChallenges.twoFactor) {
      metrics.twoFactorDetected++;
      await page.screenshot({ path: '/tmp/wanted-2fa-required.png' });
      throw new Error('2FA verification required after login');
    }

    // Extract cookies
    console.log('🍪 Extracting cookies...');
    const cookies = await page.cookies();
    const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    // Save session
    const session = {
      token: null,
      email: 'qws941@kakao.com',
      cookies: cookieString,
      timestamp: Date.now(),
    };

    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));

    console.log('✅ Session saved to:', SESSION_FILE);
    console.log('🍪 Cookies count:', cookies.length);

    // Verify by visiting profile
    console.log('🔍 Verifying login...');
    await page.goto('https://www.wanted.co.kr/cv/list', {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });

    const url = page.url();
    if (
      url.includes('/cv/') ||
      url.includes('/profile') ||
      !url.includes('/login')
    ) {
      console.log('✅ Login successful! Current URL:', url);
      success = true;
      metrics.successes++;
      metrics.lastSuccess = new Date().toISOString();
      await sendIpcNotification(`로그인 성공 (쿠키 ${cookies.length}개)`);
    } else {
      throw new Error(`Login verification failed. URL: ${url}`);
    }
  } catch (error) {
    errorMessage = error.message;
    console.error('❌ Error:', errorMessage);
    metrics.failures++;
    metrics.lastError = errorMessage;

    // Take screenshot for debugging
    try {
      await page.screenshot({ path: '/tmp/wanted-login-error.png' });
      console.log('📸 Screenshot saved to /tmp/wanted-login-error.png');
    } catch {
      /* ignore */
    }
  }

  // Save metrics before closing
  saveMetrics();

  // Close browser
  const closeDelay = success ? 5000 : 10000;
  console.log(`\n📌 Browser will close in ${closeDelay / 1000} seconds...`);
  await new Promise((r) => setTimeout(r, closeDelay));
  await browser.close();

  // Retry logic
  if (!success && retryCount < MAX_RETRIES - 1) {
    const isCaptchaOr2FA =
      errorMessage?.includes('CAPTCHA') || errorMessage?.includes('2FA');

    if (!isCaptchaOr2FA) {
      console.log(`\n🔄 Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      return autoLogin(retryCount + 1);
    } else {
      await sendIpcNotification(`로그인 실패: ${errorMessage}`, true);
    }
  } else if (!success) {
    await sendIpcNotification(
      `로그인 최종 실패 (${MAX_RETRIES}회 시도): ${errorMessage}`,
      true,
    );
  }

  // Print metrics summary
  console.log('\n📊 Metrics Summary:');
  console.log(`   Total attempts: ${metrics.attempts}`);
  console.log(`   Successes: ${metrics.successes}`);
  console.log(`   Failures: ${metrics.failures}`);
  console.log(
    `   Success rate: ${((metrics.successes / metrics.attempts) * 100).toFixed(1)}%`,
  );
  if (metrics.captchaDetected > 0)
    console.log(`   CAPTCHA detected: ${metrics.captchaDetected}`);
  if (metrics.twoFactorDetected > 0)
    console.log(`   2FA detected: ${metrics.twoFactorDetected}`);

  return success;
}

autoLogin().catch(console.error);

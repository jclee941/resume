import { SARAMIN_URLS } from './constants.js';
import { parseProfileSections, validateExtractedData } from './profile-helpers.js';

export async function humanDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await this.baseCrawler.sleep(delay);
}

export async function randomMouseMovement() {
  if (!this.page) return;

  const viewport = this.page.viewportSize() || { width: 1280, height: 800 };
  const hops = Math.floor(Math.random() * 3) + 2;

  for (let i = 0; i < hops; i++) {
    const x = Math.floor(Math.random() * viewport.width);
    const y = Math.floor(Math.random() * viewport.height);
    await this.page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 8 });
    await this.baseCrawler.sleep(Math.floor(Math.random() * 300) + 120);
  }
}

export async function humanScroll() {
  if (!this.page) return;

  await this.page.evaluate(async () => {
    const total = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      window.scrollTo({ top: Math.floor((total / steps) * i), behavior: 'smooth' });
      await new Promise((resolve) => setTimeout(resolve, 180 + Math.floor(Math.random() * 220)));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

export async function navigateWithRetry(url) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      this.log(`Navigating to ${url} (attempt ${attempt}/3)`);
      const response = await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });

      const status = response?.status?.() ?? 200;
      if (status >= 500) {
        throw new Error(`HTTP ${status}`);
      }

      await this.humanDelay(1000, 3000);
      return { success: true, status };
    } catch (error) {
      lastError = error;
      const backoff = Math.min(1000 * 2 ** (attempt - 1), 8000) + Math.floor(Math.random() * 300);
      this.log(`Navigation failed: ${error.message}; backoff=${backoff}ms`);
      if (attempt < 3) {
        await this.baseCrawler.sleep(backoff);
      }
    }
  }

  return {
    success: false,
    code: 'NETWORK_RETRY_EXHAUSTED',
    message: lastError?.message || 'Unknown navigation failure',
  };
}

export async function detectAuthMaintenanceCaptcha() {
  const url = this.page.url();
  const pageText = await this.page.evaluate(() => document.body?.innerText || '').catch(() => '');

  if (url.includes('/login') || /로그인|아이디\s*입력|비밀번호\s*입력/.test(pageText)) {
    return {
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Saramin login required',
    };
  }

  if (/서비스\s*점검중|서비스\s*점검\s*중|일시적으로\s*이용이\s*불가/.test(pageText)) {
    return {
      success: false,
      code: 'SERVICE_MAINTENANCE',
      message: 'Saramin is under maintenance',
    };
  }

  const hasCaptchaElement = await this.page
    .locator(
      'iframe[src*="captcha"], iframe[title*="captcha"], .g-recaptcha, #captcha, [class*="captcha"]'
    )
    .first()
    .isVisible()
    .catch(() => false);

  const hasCaptchaText = /captcha|로봇이\s*아닙니다|자동\s*입력\s*방지|보안\s*문자/.test(pageText);
  if (hasCaptchaElement || hasCaptchaText) {
    return {
      success: false,
      code: 'CAPTCHA_REQUIRED',
      message: 'CAPTCHA challenge detected',
    };
  }

  return { success: true };
}

export async function selectActiveResumeIfNeeded() {
  const activeResumeLink = await this.page
    .locator('a[href*="resume"], a[href*="resumemanage"]')
    .first()
    .getAttribute('href')
    .catch(() => null);

  if (!activeResumeLink) return;

  if (activeResumeLink.startsWith('http')) {
    await this.navigateWithRetry(activeResumeLink);
    return;
  }

  if (activeResumeLink.startsWith('/')) {
    await this.navigateWithRetry(`https://www.saramin.co.kr${activeResumeLink}`);
  }
}

export async function getProfile() {
  if (!this.page) {
    return {
      success: false,
      code: 'NOT_INITIALIZED',
      data: null,
      message: 'Browser not initialized. Call init() first.',
    };
  }

  const navigation = await this.navigateWithRetry(SARAMIN_URLS.suitedRecruitPerson);
  if (!navigation.success) {
    return {
      success: false,
      code: navigation.code,
      data: null,
      message: navigation.message,
    };
  }

  const pageState = await this.detectAuthMaintenanceCaptcha();
  if (!pageState.success) {
    this.log('Blocked by page state:', pageState.code);
    return {
      success: false,
      code: pageState.code,
      data: null,
      message: pageState.message,
    };
  }

  await this.selectActiveResumeIfNeeded();
  await this.humanDelay(1000, 3000);
  await this.randomMouseMovement();
  await this.humanScroll();
  await this.page.waitForTimeout(800);

  const blockedAfterInteraction = await this.detectAuthMaintenanceCaptcha();
  if (!blockedAfterInteraction.success) {
    return {
      success: false,
      code: blockedAfterInteraction.code,
      data: null,
      message: blockedAfterInteraction.message,
    };
  }

  const snapshot = await this.extractProfileSnapshot();
  const normalized = parseProfileSections(snapshot);
  const validation = validateExtractedData(normalized);

  this.log('Extraction validation:', validation);

  if (!validation.valid) {
    return {
      success: false,
      code: 'DATA_VALIDATION_FAILED',
      data: normalized,
      message: 'Extracted profile data is incomplete',
    };
  }

  return {
    success: true,
    code: 'OK',
    data: normalized,
    message: 'Saramin profile extracted successfully',
  };
}

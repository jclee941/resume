import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getResumeMasterDataPath } from '../../src/shared/utils/paths.js';
import { BaseCrawler } from '../../src/crawlers/base-crawler.js';
const SESSION_PATH = join(homedir(), '.opencode/data/saramin-session.json');

const SARAMIN_URLS = {
  login: 'https://www.saramin.co.kr/zf_user/login',
  resumeList: 'https://www.saramin.co.kr/zf_user/mypage',
  resumeEdit: 'https://www.saramin.co.kr/zf_user/mypage/resumemanage',
  suitedRecruitPerson: 'https://www.saramin.co.kr/zf_user/member/suited-recruit-person',
};

/**
 * Parse cookie string to Playwright array format
 * Converts: "name1=value1; name2=value2"
 * Into: [{name: "name1", value: "value1", domain: "...", ...}, ...]
 */
function parseCookieString(cookieString, domain = '.saramin.co.kr') {
  if (!cookieString || typeof cookieString !== 'string') {
    return [];
  }

  return cookieString
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => pair && pair.includes('='))
    .map((pair) => {
      const [name, ...valueParts] = pair.split('=');
      return {
        name: name.trim(),
        value: valueParts.join('=').trim(), // Handle values with '=' in them
        domain,
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      };
    });
}

export class SaraminProfileSync {
  constructor(options = {}) {
    this.headless = options.headless ?? false;
    this.browser = null;
    this.page = null;
    this.timeout = options.timeout || 30000;
    this.debug = options.debug ?? false;
    this.baseCrawler = new BaseCrawler('saramin-profile-sync', {
      baseUrl: 'https://www.saramin.co.kr',
      rateLimit: 1000,
      maxRetries: 3,
      timeout: this.timeout,
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
      },
    });
  }

  log(...args) {
    if (this.debug) {
      console.debug('[SaraminProfileSync]', ...args);
    }
  }

  async init() {
    this.browser = await chromium.launch({
      headless: this.headless,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1280, height: 800 },
    });

    if (existsSync(SESSION_PATH)) {
      const session = JSON.parse(readFileSync(SESSION_PATH, 'utf-8'));

      // Handle both formats: array or string
      let cookiesToAdd = [];
      if (session.cookies) {
        if (Array.isArray(session.cookies)) {
          cookiesToAdd = session.cookies;
        } else if (typeof session.cookies === 'string') {
          cookiesToAdd = parseCookieString(session.cookies);
        }
      } else if (session.cookieString) {
        cookiesToAdd = parseCookieString(session.cookieString);
      }

      if (cookiesToAdd.length > 0) {
        await context.addCookies(cookiesToAdd);
        console.log(`✅ Loaded ${cookiesToAdd.length} cookies from session`);
      }
    }

    this.page = await context.newPage();
    return this;
  }

  async checkLogin() {
    await this.page.goto(SARAMIN_URLS.resumeList, {
      waitUntil: 'load',
    });
    const url = this.page.url();
    return !url.includes('/login');
  }

  async waitForManualLogin() {
    await this.page.goto(SARAMIN_URLS.login, { waitUntil: 'load' });

    console.log('Please login manually in the browser window...');

    await this.page.waitForURL('**/zf_user/**', { timeout: 300000 });

    const cookies = await this.page.context().cookies();
    const fs = await import('fs/promises');
    await fs.mkdir(join(homedir(), '.opencode/data'), { recursive: true });
    await fs.writeFile(SESSION_PATH, JSON.stringify({ cookies }, null, 2));

    console.log('Login successful, session saved.');
    return true;
  }

  async syncProfile(sourceData, options = {}) {
    const { dry_run = false } = options;
    const results = { updated: [], skipped: [], errors: [] };

    if (!(await this.checkLogin())) {
      if (dry_run) {
        return { error: 'Not logged in', dry_run: true };
      }
      await this.waitForManualLogin();
    }

    await this.page.goto(SARAMIN_URLS.resumeEdit, {
      waitUntil: 'load',
    });

    const resumeLinks = await this.page
      .$$eval('a[href*="/zf_user/"], a[href*="resume"]', (links) => links.map((l) => l.href))
      .catch(() => []);

    if (resumeLinks.length === 0) {
      return { error: 'No resumes found. Please create one manually first.' };
    }

    if (dry_run) {
      return {
        dry_run: true,
        resume_url: SARAMIN_URLS.resumeEdit,
        would_update: {
          personal: sourceData.personal,
          careers: sourceData.careers.length,
          certifications: sourceData.certifications.length,
        },
      };
    }

    try {
      await this.fillPersonalInfo(sourceData.personal);
      results.updated.push('personal');
    } catch (e) {
      results.errors.push({ section: 'personal', error: e.message });
    }

    try {
      await this.fillCareers(sourceData.careers);
      results.updated.push('careers');
    } catch (e) {
      results.errors.push({ section: 'careers', error: e.message });
    }

    try {
      await this.fillEducation(sourceData.education);
      results.updated.push('education');
    } catch (e) {
      results.errors.push({ section: 'education', error: e.message });
    }

    try {
      await this.fillCertifications(sourceData.certifications);
      results.updated.push('certifications');
    } catch (e) {
      results.errors.push({ section: 'certifications', error: e.message });
    }

    await this.saveResume();

    return results;
  }

  async fillPersonalInfo(personal) {
    const nameInput = await this.page.$(
      'input[name="name"], input[id*="name"], input[placeholder*="이름"]'
    );
    if (nameInput) {
      await nameInput.fill(personal.name);
    }

    const emailInput = await this.page.$(
      'input[name="email"], input[type="email"], input[placeholder*="이메일"]'
    );
    if (emailInput) {
      await emailInput.fill(personal.email);
    }

    const phoneInput = await this.page.$(
      'input[name="phone"], input[name="mobile"], input[placeholder*="핸드폰"]'
    );
    if (phoneInput) {
      await phoneInput.fill(personal.phone);
    }
  }

  async fillCareers(careers) {
    const careerSection = await this.page.$('[class*="career"], [id*="career"], [class*="경력"]');
    if (!careerSection) return;

    for (const career of careers.slice(0, 5)) {
      const addBtn = await this.page.$(
        'button:has-text("추가"), a:has-text("경력 추가"), button[class*="add"]'
      );
      if (addBtn) {
        await addBtn.click();
        await this.page.waitForTimeout(500);
      }

      const companyInputs = await this.page.$$(
        'input[name*="company"], input[placeholder*="회사"], input[placeholder*="기업명"]'
      );
      const lastCompany = companyInputs[companyInputs.length - 1];
      if (lastCompany) {
        await lastCompany.fill(career.company);
      }

      const positionInputs = await this.page.$$(
        'input[name*="position"], input[placeholder*="직책"], input[placeholder*="직급"]'
      );
      const lastPosition = positionInputs[positionInputs.length - 1];
      if (lastPosition) {
        await lastPosition.fill(career.role);
      }
    }
  }

  async fillEducation(education) {
    const schoolInput = await this.page.$(
      'input[name*="school"], input[placeholder*="학교"], input[placeholder*="학교명"]'
    );
    if (schoolInput) {
      await schoolInput.fill(education.school);
    }

    const majorInput = await this.page.$(
      'input[name*="major"], input[placeholder*="전공"], input[placeholder*="전공명"]'
    );
    if (majorInput) {
      await majorInput.fill(education.major);
    }
  }

  async fillCertifications(certifications) {
    for (const cert of certifications.slice(0, 6)) {
      const addBtn = await this.page.$(
        'button:has-text("추가"), a:has-text("자격증"), button[class*="add"]'
      );
      if (addBtn) {
        await addBtn.click();
        await this.page.waitForTimeout(300);
      }

      const certInputs = await this.page.$$(
        'input[name*="cert"], input[placeholder*="자격증"], input[placeholder*="자격증명"]'
      );
      const lastCert = certInputs[certInputs.length - 1];
      if (lastCert) {
        await lastCert.fill(cert.name);
      }
    }
  }

  async saveResume() {
    const saveBtn = await this.page.$(
      'button:has-text("저장"), button[type="submit"], button[class*="save"]'
    );
    if (saveBtn) {
      await saveBtn.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async humanDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.baseCrawler.sleep(delay);
  }

  async randomMouseMovement() {
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

  async humanScroll() {
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

  async navigateWithRetry(url) {
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

  async detectAuthMaintenanceCaptcha() {
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

    const hasCaptchaText = /captcha|로봇이\s*아닙니다|자동\s*입력\s*방지|보안\s*문자/.test(
      pageText
    );
    if (hasCaptchaElement || hasCaptchaText) {
      return {
        success: false,
        code: 'CAPTCHA_REQUIRED',
        message: 'CAPTCHA challenge detected',
      };
    }

    return { success: true };
  }

  async selectActiveResumeIfNeeded() {
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

  static normalizeDate(raw) {
    if (!raw) return null;
    const match = raw.match(/(\d{4})[.\-/년\s]*(\d{1,2})?[.\-/월\s]*(\d{1,2})?/);
    if (!match) return raw.trim();
    const year = match[1];
    const month = match[2] ? String(match[2]).padStart(2, '0') : null;
    const day = match[3] ? String(match[3]).padStart(2, '0') : null;
    if (year && month && day) return `${year}.${month}.${day}`;
    if (year && month) return `${year}.${month}`;
    return year;
  }

  static parseProfileSections(snapshot) {
    const text = (snapshot?.fullText || '').replace(/\u00a0/g, ' ');
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const findByRegex = (regex) => {
      const target = lines.find((line) => regex.test(line));
      return target ? target.replace(regex, '').trim() : null;
    };

    const phoneRegex = /(01[0-9][-\s]?\d{3,4}[-\s]?\d{4})/;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

    const phoneMatch = text.match(phoneRegex);
    const emailMatch = text.match(emailRegex);
    const birthMatch = text.match(/(\d{4}[.\-/년\s]\d{1,2}[.\-/월\s]\d{1,2})/);
    const genderMatch = lines.find((line) => /남자|여자|남성|여성/.test(line));

    const personal = {
      name: snapshot?.name || findByRegex(/^이름\s*:?/),
      birthDate: SaraminProfileSync.normalizeDate(birthMatch?.[1] || null),
      gender: genderMatch || null,
      email: emailMatch?.[1] || null,
      phone: phoneMatch?.[1]?.replace(/\s/g, '') || null,
    };

    const education = {
      schoolType: findByRegex(/^(학력|학교\s*구분)\s*:?/),
      school: findByRegex(/^(학교명|학교)\s*:?/),
      major: findByRegex(/^(전공|전공명)\s*:?/),
      status: findByRegex(/^(졸업\s*상태|학적\s*상태|재학\s*여부)\s*:?/),
    };

    const careers = lines
      .filter((line) => /(주식회사|\(주\)|회사|근무|재직|퇴사)/.test(line))
      .slice(0, 10)
      .map((line) => ({
        company: line,
        role: null,
        period: null,
        employmentType: null,
      }));

    const certSkills = lines.filter((line) =>
      /(자격증|기사|기능사|CCNA|CCNP|CISSP|CISM|RHCSA|LPIC|AWS|리눅스)/i.test(line)
    );
    const technicalSkills = lines.filter((line) =>
      /(Python|Java|Node|Linux|AWS|Kubernetes|Docker|Terraform|Splunk|Forti)/i.test(line)
    );

    const desiredConditions = {
      jobType: findByRegex(/^(희망\s*직무|직무)\s*:?/),
      location: findByRegex(/^(희망\s*근무\s*지역|근무\s*지역|지역)\s*:?/),
      salary: findByRegex(/^(희망\s*연봉|연봉)\s*:?/),
    };

    const certifications = certSkills.map((name) => ({ name, issuer: null, date: null }));
    const skills = Array.from(new Set(technicalSkills)).map((name) => ({ name }));

    return {
      personal,
      education,
      careers,
      skills,
      certifications,
      desiredConditions,
      rawLines: lines,
    };
  }

  static validateExtractedData(data) {
    const personalFields = [data.personal?.name, data.personal?.email, data.personal?.phone].filter(
      Boolean
    ).length;
    const contentSignals =
      personalFields +
      (data.careers?.length || 0) +
      (data.skills?.length || 0) +
      (data.certifications?.length || 0);

    return {
      valid: personalFields >= 1 && contentSignals >= 2,
      personalFields,
      contentSignals,
    };
  }

  async extractProfileSnapshot() {
    return this.page.evaluate(() => {
      const fullText = document.body?.innerText || '';
      const nameCandidate =
        document.querySelector('[class*="name"], .user_name, .txt_name, h1')?.textContent?.trim() ||
        null;

      return {
        url: window.location.href,
        title: document.title,
        fullText,
        name: nameCandidate,
      };
    });
  }

  async getProfile() {
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
    const normalized = SaraminProfileSync.parseProfileSections(snapshot);
    const validation = SaraminProfileSync.validateExtractedData(normalized);

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

  async close() {
    this.baseCrawler?.destroy?.();
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export async function syncToSaramin(options = {}) {
  const RESUME_DATA_PATH = getResumeMasterDataPath();
  if (!existsSync(RESUME_DATA_PATH)) {
    return { error: `Source not found: ${RESUME_DATA_PATH}` };
  }

  const sourceData = JSON.parse(readFileSync(RESUME_DATA_PATH, 'utf-8'));
  const sync = new SaraminProfileSync(options);

  try {
    await sync.init();
    const result = await sync.syncProfile(sourceData, options);
    return result;
  } finally {
    await sync.close();
  }
}

export default SaraminProfileSync;

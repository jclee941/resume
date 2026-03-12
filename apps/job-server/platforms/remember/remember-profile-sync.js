import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PROJECT_ROOT = join(homedir(), 'dev/resume');
const RESUME_DATA_PATH = join(
  PROJECT_ROOT,
  'packages/data/resumes/master/resume_data.json',
);
const SESSION_PATH = join(homedir(), '.opencode/data/remember-session.json');

const REMEMBER_URLS = {
  home: 'https://career.rememberapp.co.kr',
  login: 'https://career.rememberapp.co.kr/login',
  profile: 'https://career.rememberapp.co.kr/mypage/profile',
  resume: 'https://career.rememberapp.co.kr/mypage/resume',
};

export class RememberProfileSync {
  constructor(options = {}) {
    this.headless = options.headless ?? false;
    this.browser = null;
    this.page = null;
    this.timeout = options.timeout || 30000;
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
      if (session.cookies) {
        await context.addCookies(session.cookies);
      }
    }

    this.page = await context.newPage();
    return this;
  }

  async checkLogin() {
    await this.page.goto(REMEMBER_URLS.profile, { waitUntil: 'networkidle' });
    const url = this.page.url();
    return !url.includes('/login');
  }

  async waitForManualLogin() {
    await this.page.goto(REMEMBER_URLS.login, { waitUntil: 'networkidle' });

    console.log('Please login via Remember mobile app QR code...');

    await this.page.waitForURL('**/mypage/**', { timeout: 300000 });

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

    if (dry_run) {
      return {
        dry_run: true,
        would_update: {
          headline: `${sourceData.current.position} @ ${sourceData.current.company}`,
          experience: sourceData.summary.totalExperience,
          careers: sourceData.careers.length,
        },
      };
    }

    await this.page.goto(REMEMBER_URLS.profile, { waitUntil: 'networkidle' });

    try {
      await this.updateHeadline(sourceData);
      results.updated.push('headline');
    } catch (e) {
      results.errors.push({ section: 'headline', error: e.message });
    }

    try {
      await this.updateCareers(sourceData.careers);
      results.updated.push('careers');
    } catch (e) {
      results.errors.push({ section: 'careers', error: e.message });
    }

    try {
      await this.updateSkills(sourceData.summary.expertise);
      results.updated.push('skills');
    } catch (e) {
      results.errors.push({ section: 'skills', error: e.message });
    }

    return results;
  }

  async updateHeadline(sourceData) {
    const editBtn = await this.page.$(
      'button:has-text("수정"), [class*="edit"]',
    );
    if (editBtn) {
      await editBtn.click();
      await this.page.waitForTimeout(500);
    }

    const headline = `${sourceData.current.position} | ${sourceData.summary.totalExperience}`;
    const headlineInput = await this.page.$(
      'input[name*="headline"], textarea[name*="intro"]',
    );
    if (headlineInput) {
      await headlineInput.fill(headline);
    }

    const saveBtn = await this.page.$(
      'button:has-text("저장"), button[type="submit"]',
    );
    if (saveBtn) {
      await saveBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async updateCareers(careers) {
    const careerSection = await this.page.$(
      '[class*="career"], [data-section="career"]',
    );
    if (!careerSection) return;

    for (const career of careers.slice(0, 5)) {
      const addBtn = await this.page.$('button:has-text("경력 추가")');
      if (addBtn) {
        await addBtn.click();
        await this.page.waitForTimeout(500);
      }

      const companyInput = await this.page.$(
        'input[name*="company"]:last-of-type',
      );
      if (companyInput) {
        await companyInput.fill(career.company);
      }

      const titleInput = await this.page.$('input[name*="title"]:last-of-type');
      if (titleInput) {
        await titleInput.fill(career.role);
      }

      const periodInput = await this.page.$(
        'input[name*="period"]:last-of-type',
      );
      if (periodInput) {
        await periodInput.fill(career.period);
      }
    }
  }

  async updateSkills(skills) {
    const skillSection = await this.page.$(
      '[class*="skill"], [data-section="skill"]',
    );
    if (!skillSection) return;

    for (const skill of skills) {
      const skillInput = await this.page.$(
        'input[name*="skill"], input[placeholder*="스킬"]',
      );
      if (skillInput) {
        await skillInput.fill(skill);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(300);
      }
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export async function syncToRemember(options = {}) {
  if (!existsSync(RESUME_DATA_PATH)) {
    return { error: `Source not found: ${RESUME_DATA_PATH}` };
  }

  const sourceData = JSON.parse(readFileSync(RESUME_DATA_PATH, 'utf-8'));
  const sync = new RememberProfileSync(options);

  try {
    await sync.init();
    const result = await sync.syncProfile(sourceData, options);
    return result;
  } finally {
    await sync.close();
  }
}

export default RememberProfileSync;

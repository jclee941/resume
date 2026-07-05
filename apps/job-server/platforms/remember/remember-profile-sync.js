import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { getResumeBasePath } from '../../src/shared/utils/paths.js';
import { BaseProfileSync } from '../base-profile-sync.js';

const PROJECT_ROOT = getResumeBasePath();
const RESUME_DATA_PATH = join(PROJECT_ROOT, 'packages/data/resumes/master/resume_data.json');
const SESSION_PATH = join(PROJECT_ROOT, 'remember-session.json');

const REMEMBER_URLS = {
  home: 'https://career.rememberapp.co.kr',
  login: 'https://career.rememberapp.co.kr/login',
  profile: 'https://career.rememberapp.co.kr/mypage/profile',
  resume: 'https://career.rememberapp.co.kr/mypage/resume',
};

const PROFILE_READY_SELECTOR =
  '.user-name, .name, [class*="profile"] h1, h2, .headline, .intro, [class*="intro"], [class*="career"], [class*="skill"]';

export class RememberProfileSync extends BaseProfileSync {
  constructor(options = {}) {
    super(options);
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
      if (session.cookies && Array.isArray(session.cookies)) {
        await context.addCookies(session.cookies);
      } else if (session.cookieString) {
        const parsed = session.cookieString
          .split(';')
          .map((p) => p.trim())
          .filter((p) => p && p.includes('='))
          .map((p) => {
            const [name, ...v] = p.split('=');
            return {
              name: name.trim(),
              value: v.join('=').trim(),
              domain: '.rememberapp.co.kr',
              path: '/',
              httpOnly: false,
              secure: true,
              sameSite: 'Lax',
            };
          });
        if (parsed.length > 0) await context.addCookies(parsed);
      }
    }

    this.page = await context.newPage();
    return this;
  }

  async checkLogin() {
    await this.page.goto(REMEMBER_URLS.profile, { waitUntil: 'domcontentloaded' });
    const url = this.page.url();
    if (url.includes('/login')) {
      return false;
    }
    await this.page.waitForSelector(PROFILE_READY_SELECTOR, { timeout: 10000 });
    return true;
  }

  async waitForManualLogin() {
    await this.page.goto(REMEMBER_URLS.login, { waitUntil: 'domcontentloaded' });

    console.log('Please login via Remember mobile app QR code...');

    await this.page.waitForURL('**/mypage/**', { timeout: 300000 });

    const cookies = await this.page.context().cookies();
    const fs = await import('fs/promises');
    await fs.mkdir(dirname(SESSION_PATH), { recursive: true });
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
          headline: `${sourceData.current?.position || sourceData.careers?.[0]?.role || ''} @ ${sourceData.current?.company || sourceData.careers?.[0]?.company || ''}`,
          experience: sourceData.summary.totalExperience,
          careers: sourceData.careers.length,
        },
      };
    }

    await this.page.goto(REMEMBER_URLS.profile, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector(PROFILE_READY_SELECTOR, { timeout: 10000 });

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
    const editBtn = await this.page.$('button:has-text("수정"), [class*="edit"]');
    if (editBtn) {
      await editBtn.click();
      await this.page.waitForTimeout(500);
    }

    const headline = `${sourceData.current?.position || sourceData.careers?.[0]?.role || ''} | ${sourceData.summary.totalExperience}`;
    const headlineInput = await this.page.$('input[name*="headline"], textarea[name*="intro"]');
    if (headlineInput) {
      await headlineInput.fill(headline);
    }

    const saveBtn = await this.page.$('button:has-text("저장"), button[type="submit"]');
    if (saveBtn) {
      await saveBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async updateCareers(careers) {
    const careerSection = await this.page.$('[class*="career"], [data-section="career"]');
    if (!careerSection) return;

    for (const career of careers.slice(0, 5)) {
      const addBtn = await this.page.$('button:has-text("경력 추가")');
      if (addBtn) {
        await addBtn.click();
        await this.page.waitForTimeout(500);
      }

      const companyInput = await this.page.$('input[name*="company"]:last-of-type');
      if (companyInput) {
        await companyInput.fill(career.company);
      }

      const titleInput = await this.page.$('input[name*="title"]:last-of-type');
      if (titleInput) {
        await titleInput.fill(career.role);
      }

      const periodInput = await this.page.$('input[name*="period"]:last-of-type');
      if (periodInput) {
        await periodInput.fill(career.period);
      }
    }
  }

  async updateSkills(skills) {
    const skillSection = await this.page.$('[class*="skill"], [data-section="skill"]');
    if (!skillSection) return;

    for (const skill of skills) {
      const skillInput = await this.page.$('input[name*="skill"], input[placeholder*="스킬"]');
      if (skillInput) {
        await skillInput.fill(skill);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(300);
      }
    }
  }
  async getProfile() {
    if (!this.page) {
      return { success: false, code: 'NOT_INITIALIZED', data: null };
    }
    await this.page.goto(REMEMBER_URLS.profile, { waitUntil: 'domcontentloaded' });
    const url = this.page.url();
    if (url.includes('/login')) {
      return { success: false, code: 'AUTH_REQUIRED', data: null };
    }
    await this.page.waitForSelector(PROFILE_READY_SELECTOR, { timeout: 10000 });
    const snapshot = await this.page.evaluate(() => {
      const nameEl = document.querySelector('.user-name, .name, [class*="profile"] h1, h2');
      const headlineEl = document.querySelector('.headline, .intro, [class*="intro"]');
      const schoolEl = document.querySelector('[class*="school"], [data-section="education"]');
      const majorEl = document.querySelector('[class*="major"]');
      const careerEls = document.querySelectorAll(
        '[class*="career-item"], [class*="experience-item"]'
      );
      const certEls = document.querySelectorAll('[class*="cert-item"], [class*="certification"]');
      const skillEls = document.querySelectorAll('[class*="skill-tag"], [class*="skill-item"]');
      return {
        name: nameEl?.textContent?.trim() || '',
        headline: headlineEl?.textContent?.trim() || '',
        education: {
          school: schoolEl?.textContent?.trim() || '',
          major: majorEl?.textContent?.trim() || '',
        },
        careers: Array.from(careerEls).map((el) => ({ company: el.textContent?.trim() || '' })),
        certifications: Array.from(certEls).map((el) => ({ name: el.textContent?.trim() || '' })),
        skills: Array.from(skillEls)
          .map((el) => el.textContent?.trim())
          .filter(Boolean),
      };
    });
    return { success: true, code: 'OK', data: snapshot };
  }

  async updateEducation(education) {
    const eduSection = await this.page.$('[class*="education"], [data-section="education"]');
    if (!eduSection) return;

    const editBtn = await eduSection.$('button:has-text("수정"), button[class*="edit"]');
    if (editBtn) {
      await editBtn.click();
      await this.page.waitForTimeout(500);
    }

    const schoolInput = await this.page.$('input[name*="school"], input[placeholder*="학교"]');
    if (schoolInput) {
      await schoolInput.fill(education.school);
    }

    const majorInput = await this.page.$('input[name*="major"], input[placeholder*="전공"]');
    if (majorInput) {
      await majorInput.fill(education.major);
    }

    const saveBtn = await eduSection.$('button:has-text("저장"), button[type="submit"]');
    if (saveBtn) {
      await saveBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async updateCertifications(certifications) {
    const certSection = await this.page.$(
      '[class*="certification"], [data-section="certification"]'
    );
    if (!certSection) return;

    for (const cert of certifications.slice(0, 6)) {
      const addBtn = await certSection.$('button:has-text("추가"), button[class*="add"]');
      if (addBtn) {
        await addBtn.click();
        await this.page.waitForTimeout(300);
      }

      const certInputs = await this.page.$$('input[name*="cert"], input[placeholder*="자격증"]');
      const lastCert = certInputs[certInputs.length - 1];
      if (lastCert) {
        await lastCert.fill(cert.name);
      }

      if (cert.issuer) {
        const issuerInputs = await this.page.$$(
          'input[name*="issuer"], input[placeholder*="발급기관"]'
        );
        const lastIssuer = issuerInputs[issuerInputs.length - 1];
        if (lastIssuer) {
          await lastIssuer.fill(cert.issuer);
        }
      }

      if (cert.date) {
        const dateInputs = await this.page.$$(
          'input[name*="date"], input[placeholder*="취득일"], input[type="date"]'
        );
        const lastDate = dateInputs[dateInputs.length - 1];
        if (lastDate) {
          await lastDate.fill(cert.date);
        }
      }

      const saveBtn = await certSection.$('button:has-text("저장"), button[type="submit"]');
      if (saveBtn) {
        await saveBtn.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
    await super.close();
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

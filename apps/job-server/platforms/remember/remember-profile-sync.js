import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { getResumeBasePath } from '../../src/shared/utils/paths.js';
import { BaseProfileSync } from '../base-profile-sync.js';
import {
  updateRememberCareers,
  updateRememberEducation,
  updateRememberHeadline,
  updateRememberSkills,
} from './remember-profile-sections.js';

/** @typedef {import('playwright').Page} P */
/** @typedef {import('./remember-profile-sections.js').RememberCareer} RememberCareer */
/** @typedef {import('./remember-profile-sections.js').RememberEducation} RememberEducation */
/** @typedef {import('./remember-profile-sections.js').RememberSourceData} RememberSourceData */

/**
 * @typedef {Object} RememberSyncSourceData
 * @property {{ position?: string, company?: string }} [current]
 * @property {RememberCareer[]} careers
 * @property {{ totalExperience: string, expertise: string[] }} summary
 */

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
      /** @type {{ cookies?: import('playwright').Cookie[], cookieString?: string }} */
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
              sameSite: /** @type {const} */ ('Lax'),
            };
          });
        if (parsed.length > 0) await context.addCookies(parsed);
      }
    }

    this.page = await context.newPage();
    return this;
  }

  async checkLogin() {
    await /**@type {P}*/ (this.page).goto(REMEMBER_URLS.profile, { waitUntil: 'domcontentloaded' });
    const url = /**@type {P}*/ (this.page).url();
    if (url.includes('/login')) {
      return false;
    }
    await /**@type {P}*/ (this.page).waitForSelector(PROFILE_READY_SELECTOR, { timeout: 10000 });
    return true;
  }

  async waitForManualLogin() {
    await /**@type {P}*/ (this.page).goto(REMEMBER_URLS.login, { waitUntil: 'domcontentloaded' });

    console.log('Please login via Remember mobile app QR code...');

    await /**@type {P}*/ (this.page).waitForURL('**/mypage/**', { timeout: 300000 });

    const cookies = await /**@type {P}*/ (this.page).context().cookies();
    const fs = await import('fs/promises');
    await fs.mkdir(dirname(SESSION_PATH), { recursive: true });
    await fs.writeFile(SESSION_PATH, JSON.stringify({ cookies }, null, 2));

    console.log('Login successful, session saved.');
    return true;
  }

  /**
   * @param {RememberSyncSourceData} sourceData
   * @param {{ dry_run?: boolean }} [options]
   */
  async syncProfile(sourceData, options = {}) {
    const { dry_run = false } = options;
    /** @type {{ updated: string[], skipped: string[], errors: Array<{ section: string, error: string }> }} */
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

    await /**@type {P}*/ (this.page).goto(REMEMBER_URLS.profile, { waitUntil: 'domcontentloaded' });
    await /**@type {P}*/ (this.page).waitForSelector(PROFILE_READY_SELECTOR, { timeout: 10000 });

    try {
      await this.updateHeadline(sourceData);
      results.updated.push('headline');
    } catch (e) {
      results.errors.push({ section: 'headline', error: /** @type {Error} */ (e).message });
    }

    try {
      await this.updateCareers(sourceData.careers);
      results.updated.push('careers');
    } catch (e) {
      results.errors.push({ section: 'careers', error: /** @type {Error} */ (e).message });
    }

    try {
      await this.updateSkills(sourceData.summary.expertise);
      results.updated.push('skills');
    } catch (e) {
      results.errors.push({ section: 'skills', error: /** @type {Error} */ (e).message });
    }

    return results;
  }

  /**
   * @param {RememberSourceData} sourceData
   */
  async updateHeadline(sourceData) {
    return updateRememberHeadline(/**@type {P}*/ (this.page), sourceData);
  }

  /**
   * @param {RememberCareer[]} careers
   */
  async updateCareers(careers) {
    return updateRememberCareers(/**@type {P}*/ (this.page), careers);
  }

  /**
   * @param {string[]} skills
   */
  async updateSkills(skills) {
    return updateRememberSkills(/**@type {P}*/ (this.page), skills);
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

  /**
   * @param {RememberEducation} education
   */
  async updateEducation(education) {
    return updateRememberEducation(/**@type {P}*/ (this.page), education);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
    await super.close();
  }
}

/**
 * @param {Record<string, unknown>} [options]
 */
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

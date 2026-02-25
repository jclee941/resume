import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PROJECT_ROOT = join(homedir(), 'dev/resume');
const RESUME_DATA_PATH = join(
  PROJECT_ROOT,
  'typescript/data/resumes/master/resume_data.json',
);
const SESSION_PATH = join(homedir(), '.OpenCode/data/jobkorea-session.json');

const JOBKOREA_URLS = {
  login: 'https://www.jobkorea.co.kr/Login',
  resumeList: 'https://www.jobkorea.co.kr/User/Resume',
  resumeEdit: 'https://www.jobkorea.co.kr/User/Resume/Edit',
};

/**
 * Parse cookie string to Playwright array format
 * Converts: "name1=value1; name2=value2"
 * Into: [{name: "name1", value: "value1", domain: "...", ...}, ...]
 */
function parseCookieString(cookieString, domain = '.jobkorea.co.kr') {
  if (!cookieString || typeof cookieString !== 'string') {
    return [];
  }

  return cookieString
    .split(';')
    .map(pair => pair.trim())
    .filter(pair => pair && pair.includes('='))
    .map(pair => {
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

export class JobKoreaProfileSync {
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
      
      // Handle both formats: array or string
      let cookiesToAdd = [];
      if (session.cookies) {
        if (Array.isArray(session.cookies)) {
          // Already in array format (from browser context)
          cookiesToAdd = session.cookies;
        } else if (typeof session.cookies === 'string') {
          // String format (from auth-persistent.js) - parse it
          cookiesToAdd = parseCookieString(session.cookies);
        }
        
        if (cookiesToAdd.length > 0) {
          await context.addCookies(cookiesToAdd);
          console.log(`✅ Loaded ${cookiesToAdd.length} cookies from session`);
        }
      }
    }

    this.page = await context.newPage();
    return this;
  }

  async checkLogin() {
    await this.page.goto(JOBKOREA_URLS.resumeList, {
      waitUntil: 'networkidle',
    });
    const url = this.page.url();
    return !url.includes('/Login');
  }

  async waitForManualLogin() {
    await this.page.goto(JOBKOREA_URLS.login, { waitUntil: 'networkidle' });

    console.log('Please login manually in the browser window...');

    await this.page.waitForURL('**/User/**', { timeout: 300000 });

    const cookies = await this.page.context().cookies();
    const fs = await import('fs/promises');
    await fs.mkdir(join(homedir(), '.OpenCode/data'), { recursive: true });
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

    await this.page.goto(JOBKOREA_URLS.resumeList, {
      waitUntil: 'networkidle',
    });

    const resumeLinks = await this.page.$$eval(
      'a[href*="/User/Resume/"]',
      (links) =>
        links
          .filter((l) => l.href.includes('/Edit') || l.href.includes('/View'))
          .map((l) => l.href),
    );

    if (resumeLinks.length === 0) {
      return { error: 'No resumes found. Please create one manually first.' };
    }

    const editUrl =
      resumeLinks.find((l) => l.includes('/Edit')) ||
      resumeLinks[0].replace('/View', '/Edit');

    if (dry_run) {
      return {
        dry_run: true,
        resume_url: editUrl,
        would_update: {
          personal: sourceData.personal,
          careers: sourceData.careers.length,
          certifications: sourceData.certifications.length,
        },
      };
    }

    await this.page.goto(editUrl, { waitUntil: 'networkidle' });

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
      'input[name="name"], input[id*="name"]',
    );
    if (nameInput) {
      await nameInput.fill(personal.name);
    }

    const emailInput = await this.page.$(
      'input[name="email"], input[type="email"]',
    );
    if (emailInput) {
      await emailInput.fill(personal.email);
    }

    const phoneInput = await this.page.$(
      'input[name="phone"], input[name="mobile"]',
    );
    if (phoneInput) {
      await phoneInput.fill(personal.phone);
    }
  }

  async fillCareers(careers) {
    const careerSection = await this.page.$(
      '[class*="career"], [id*="career"]',
    );
    if (!careerSection) return;

    for (const career of careers.slice(0, 5)) {
      const addBtn = await this.page.$(
        'button:has-text("경력추가"), a:has-text("경력추가")',
      );
      if (addBtn) {
        await addBtn.click();
        await this.page.waitForTimeout(500);
      }

      const companyInputs = await this.page.$$(
        'input[name*="company"], input[placeholder*="회사"]',
      );
      const lastCompany = companyInputs[companyInputs.length - 1];
      if (lastCompany) {
        await lastCompany.fill(career.company);
      }

      const positionInputs = await this.page.$$(
        'input[name*="position"], input[placeholder*="직책"]',
      );
      const lastPosition = positionInputs[positionInputs.length - 1];
      if (lastPosition) {
        await lastPosition.fill(career.role);
      }
    }
  }

  async fillEducation(education) {
    const schoolInput = await this.page.$(
      'input[name*="school"], input[placeholder*="학교"]',
    );
    if (schoolInput) {
      await schoolInput.fill(education.school);
    }

    const majorInput = await this.page.$(
      'input[name*="major"], input[placeholder*="전공"]',
    );
    if (majorInput) {
      await majorInput.fill(education.major);
    }
  }

  async fillCertifications(certifications) {
    for (const cert of certifications.slice(0, 6)) {
      const addBtn = await this.page.$(
        'button:has-text("자격증추가"), a:has-text("자격증")',
      );
      if (addBtn) {
        await addBtn.click();
        await this.page.waitForTimeout(300);
      }

      const certInputs = await this.page.$$(
        'input[name*="cert"], input[placeholder*="자격증"]',
      );
      const lastCert = certInputs[certInputs.length - 1];
      if (lastCert) {
        await lastCert.fill(cert.name);
      }
    }
  }

  async saveResume() {
    const saveBtn = await this.page.$(
      'button:has-text("저장"), button[type="submit"]',
    );
    if (saveBtn) {
      await saveBtn.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export async function syncToJobKorea(options = {}) {
  if (!existsSync(RESUME_DATA_PATH)) {
    return { error: `Source not found: ${RESUME_DATA_PATH}` };
  }

  const sourceData = JSON.parse(readFileSync(RESUME_DATA_PATH, 'utf-8'));
  const sync = new JobKoreaProfileSync(options);

  try {
    await sync.init();
    const result = await sync.syncProfile(sourceData, options);
    return result;
  } finally {
    await sync.close();
  }
}

export default JobKoreaProfileSync;

/**
 * BrowserProfileSync — reusable browser-automation scaffold for job platforms.
 *
 * Platforms configure URLs, selectors, and field mappings. The base class
 * handles login check, manual login wait, profile extraction, diff-based
 * selective sync, and generic form filling.
 */
import { chromium } from 'playwright';
import { BaseProfileSync, diffProfileSections } from './base-profile-sync.js';

export class BrowserProfileSync extends BaseProfileSync {
  constructor(options = {}) {
    super(options);
    this.platform = options.platform || 'unknown';
    this.urls = options.urls || {};
    this.selectors = options.selectors || {};
    this.sessionPath = options.sessionPath;
  }

  async init() {
    this.browser = await chromium.launch({
      headless: this.headless,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    if (this.sessionPath) {
      const { existsSync, readFileSync } = await import('fs');
      if (existsSync(this.sessionPath)) {
        const session = JSON.parse(readFileSync(this.sessionPath, 'utf-8'));
        if (session.cookies?.length) {
          await context.addCookies(session.cookies);
        }
      }
    }

    this.page = await context.newPage();
    return this;
  }

  async checkLogin() {
    if (!this.page || !this.urls.profile) return false;
    await this.page.goto(this.urls.profile, { waitUntil: 'networkidle' });
    const url = this.page.url();
    return !url.includes('/login') && !url.includes('/auth');
  }

  async waitForManualLogin() {
    if (!this.urls.login) throw new Error('login URL not configured');
    await this.page.goto(this.urls.login, { waitUntil: 'networkidle' });
    console.log(`[${this.platform}] Please login manually...`);
    await this.page.waitForURL('**/mypage/**', { timeout: 300000 });

    const cookies = await this.page.context().cookies();
    if (this.sessionPath) {
      const { writeFileSync, mkdirSync } = await import('fs');
      const { dirname } = await import('path');
      mkdirSync(dirname(this.sessionPath), { recursive: true });
      writeFileSync(this.sessionPath, JSON.stringify({ cookies }, null, 2));
    }
    console.log(`[${this.platform}] Login successful, session saved.`);
    return true;
  }

  async getProfile() {
    if (!this.page) {
      return { success: false, code: 'NOT_INITIALIZED', data: null };
    }
    await this.page.goto(this.urls.profile, { waitUntil: 'networkidle' });
    const url = this.page.url();
    if (url.includes('/login') || url.includes('/auth')) {
      return { success: false, code: 'AUTH_REQUIRED', data: null };
    }

    const data = await this.page.evaluate((sel) => {
      const text = (q) => document.querySelector(q)?.textContent?.trim() || '';
      return {
        name: text(sel.name),
        headline: text(sel.headline),
        personal: {
          name: text(sel.name),
          email: text(sel.email),
          phone: text(sel.phone),
        },
        education: {
          school: text(sel.school),
          major: text(sel.major),
        },
        skills: Array.from(document.querySelectorAll(sel.skills))
          .map((el) => el.textContent?.trim())
          .filter(Boolean),
      };
    }, this.selectors);

    return { success: true, code: 'OK', data };
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
      const current = await this.getProfile().catch(() => ({ data: null }));
      const changes = current.data ? diffProfileSections(sourceData, current.data) : [];
      return {
        dry_run: true,
        would_update: {
          personal: sourceData.personal,
          careers: sourceData.careers?.length ?? 0,
          education: sourceData.education,
          certifications: sourceData.certifications?.length ?? 0,
        },
        changes,
      };
    }

    const current = await this.getProfile().catch(() => ({ data: null }));
    const changes = current.data ? diffProfileSections(sourceData, current.data) : null;
    const changedSections = new Set(changes?.map((c) => c.section) ?? []);

    if (changes && changes.length === 0) {
      results.skipped.push('all');
      return results;
    }

    if (!changedSections.size || changedSections.has('personal')) {
      try {
        await this.fillPersonalInfo(sourceData.personal);
        results.updated.push('personal');
      } catch (e) {
        results.errors.push({ section: 'personal', error: e.message });
      }
    } else {
      results.skipped.push('personal');
    }

    if (!changedSections.size || changedSections.has('careers')) {
      try {
        await this.fillCareers(sourceData.careers);
        results.updated.push('careers');
      } catch (e) {
        results.errors.push({ section: 'careers', error: e.message });
      }
    } else {
      results.skipped.push('careers');
    }

    if (!changedSections.size || changedSections.has('education')) {
      try {
        await this.fillEducation(sourceData.education);
        results.updated.push('education');
      } catch (e) {
        results.errors.push({ section: 'education', error: e.message });
      }
    } else {
      results.skipped.push('education');
    }

    if (!changedSections.size || changedSections.has('certifications')) {
      try {
        await this.fillCertifications(sourceData.certifications);
        results.updated.push('certifications');
      } catch (e) {
        results.errors.push({ section: 'certifications', error: e.message });
      }
    } else {
      results.skipped.push('certifications');
    }

    await this.saveProfile();
    return results;
  }

  async fillPersonalInfo(personal) {
    if (!this.urls.edit) return;
    await this.page.goto(this.urls.edit, { waitUntil: 'networkidle' });
    const s = this.selectors;
    if (s.nameInput && personal.name) {
      const el = await this.page.$(s.nameInput);
      if (el) await el.fill(personal.name);
    }
    if (s.emailInput && personal.email) {
      const el = await this.page.$(s.emailInput);
      if (el) await el.fill(personal.email);
    }
    if (s.phoneInput && personal.phone) {
      const el = await this.page.$(s.phoneInput);
      if (el) await el.fill(personal.phone);
    }
  }

  async fillCareers(careers) {
    if (!Array.isArray(careers)) return;
    for (const career of careers.slice(0, 5)) {
      const addBtn = await this.page.$(
        'button:has-text("추가"), a:has-text("경력 추가"), button[class*="add"]'
      );
      if (addBtn) {
        await addBtn.click();
        await this.page.waitForTimeout(500);
      }
      const companyInputs = await this.page.$$(
        this.selectors.companyInput || 'input[name*="company"], input[placeholder*="회사"]'
      );
      const lastCompany = companyInputs[companyInputs.length - 1];
      if (lastCompany) await lastCompany.fill(career.company);

      const titleInputs = await this.page.$$(
        this.selectors.titleInput || 'input[name*="title"], input[placeholder*="직책"]'
      );
      const lastTitle = titleInputs[titleInputs.length - 1];
      if (lastTitle) await lastTitle.fill(career.role);
    }
  }

  async fillEducation(education) {
    if (!education) return;
    const schoolInput = await this.page.$(
      this.selectors.schoolInput || 'input[name*="school"], input[placeholder*="학교"]'
    );
    if (schoolInput) await schoolInput.fill(education.school);

    const majorInput = await this.page.$(
      this.selectors.majorInput || 'input[name*="major"], input[placeholder*="전공"]'
    );
    if (majorInput) await majorInput.fill(education.major);

    if (education.status) {
      const statusSelect = await this.page.$('select[name*="status"], select[name*="graduation"]');
      if (statusSelect) {
        await statusSelect.selectOption({ label: education.status });
      }
    }
  }

  async fillCertifications(certifications) {
    if (!Array.isArray(certifications)) return;
    for (const cert of certifications.slice(0, 6)) {
      const addBtn = await this.page.$(
        'button:has-text("추가"), a:has-text("자격증"), button[class*="add"]'
      );
      if (addBtn) {
        await addBtn.click();
        await this.page.waitForTimeout(300);
      }
      const certInputs = await this.page.$$(
        this.selectors.certInput || 'input[name*="cert"], input[placeholder*="자격증"]'
      );
      const lastCert = certInputs[certInputs.length - 1];
      if (lastCert) await lastCert.fill(cert.name);

      if (cert.issuer) {
        const issuerInputs = await this.page.$$(
          'input[name*="issuer"], input[placeholder*="발급기관"]'
        );
        const lastIssuer = issuerInputs[issuerInputs.length - 1];
        if (lastIssuer) await lastIssuer.fill(cert.issuer);
      }
      if (cert.date) {
        const dateInputs = await this.page.$$(
          'input[name*="date"], input[placeholder*="취득일"], input[type="date"]'
        );
        const lastDate = dateInputs[dateInputs.length - 1];
        if (lastDate) await lastDate.fill(cert.date);
      }
    }
  }

  async saveProfile() {
    const saveBtn = await this.page.$(
      'button:has-text("저장"), button[type="submit"], button[class*="save"]'
    );
    if (saveBtn) {
      await saveBtn.click();
      await this.page.waitForTimeout(2000);
    }
  }
}

export default BrowserProfileSync;

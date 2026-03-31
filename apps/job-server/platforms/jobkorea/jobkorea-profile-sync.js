/**
 * @deprecated Use apps/job-server/scripts/profile-sync/jobkorea-handler.js instead.
 * This file used CSS-selector-based form filling which no longer works.
 * The new handler uses form serialization + $.post('/User/Resume/Save') via page.evaluate().
 * Run: node apps/job-server/scripts/profile-sync/index.js jobkorea [--apply]
 */

import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { BaseCrawler } from '../../src/crawlers/base-crawler.js';
import { SessionManager } from '../../src/shared/services/session/session-manager.js';

const PROJECT_ROOT = join(homedir(), 'dev/resume');
const RESUME_DATA_PATH = join(PROJECT_ROOT, 'packages/data/resumes/master/resume_data.json');
const SESSION_PATH = join(homedir(), '.opencode/data/jobkorea-session.json');

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

export class JobKoreaProfileSync {
  constructor(options = {}) {
    this.headless = options.headless ?? false;
    this.browser = null;
    this.page = null;
    this.timeout = options.timeout || 30000;
    this.logger = options.logger || console;
    this.crawler =
      options.crawler ||
      new BaseCrawler('jobkorea-profile-sync', {
        baseUrl: 'https://www.jobkorea.co.kr',
        timeout: this.timeout,
        rateLimit: 1000,
      });
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

    await this.page.goto(JOBKOREA_URLS.resumeList, {
      waitUntil: 'networkidle',
    });

    const resumeLinks = await this.page.$$eval('a[href*="/User/Resume/"]', (links) =>
      links.filter((l) => l.href.includes('/Edit') || l.href.includes('/View')).map((l) => l.href)
    );

    if (resumeLinks.length === 0) {
      return { error: 'No resumes found. Please create one manually first.' };
    }

    const editUrl =
      resumeLinks.find((l) => l.includes('/Edit')) || resumeLinks[0].replace('/View', '/Edit');

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
    const nameInput = await this.page.$('input[name="name"], input[id*="name"]');
    if (nameInput) {
      await nameInput.fill(personal.name);
    }

    const emailInput = await this.page.$('input[name="email"], input[type="email"]');
    if (emailInput) {
      await emailInput.fill(personal.email);
    }

    const phoneInput = await this.page.$('input[name="phone"], input[name="mobile"]');
    if (phoneInput) {
      await phoneInput.fill(personal.phone);
    }
  }

  async fillCareers(careers) {
    const careerSection = await this.page.$('[class*="career"], [id*="career"]');
    if (!careerSection) return;

    for (const career of careers.slice(0, 5)) {
      const addBtn = await this.page.$('button:has-text("경력추가"), a:has-text("경력추가")');
      if (addBtn) {
        await addBtn.click();
        await this.page.waitForTimeout(500);
      }

      const companyInputs = await this.page.$$(
        'input[name*="company"], input[placeholder*="회사"]'
      );
      const lastCompany = companyInputs[companyInputs.length - 1];
      if (lastCompany) {
        await lastCompany.fill(career.company);
      }

      const positionInputs = await this.page.$$(
        'input[name*="position"], input[placeholder*="직책"]'
      );
      const lastPosition = positionInputs[positionInputs.length - 1];
      if (lastPosition) {
        await lastPosition.fill(career.role);
      }
    }
  }

  async fillEducation(education) {
    const schoolInput = await this.page.$('input[name*="school"], input[placeholder*="학교"]');
    if (schoolInput) {
      await schoolInput.fill(education.school);
    }

    const majorInput = await this.page.$('input[name*="major"], input[placeholder*="전공"]');
    if (majorInput) {
      await majorInput.fill(education.major);
    }
  }

  async fillCertifications(certifications) {
    for (const cert of certifications.slice(0, 6)) {
      const addBtn = await this.page.$('button:has-text("자격증추가"), a:has-text("자격증")');
      if (addBtn) {
        await addBtn.click();
        await this.page.waitForTimeout(300);
      }

      const certInputs = await this.page.$$('input[name*="cert"], input[placeholder*="자격증"]');
      const lastCert = certInputs[certInputs.length - 1];
      if (lastCert) {
        await lastCert.fill(cert.name);
      }
    }
  }

  async saveResume() {
    const saveBtn = await this.page.$('button:has-text("저장"), button[type="submit"]');
    if (saveBtn) {
      await saveBtn.click();
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Fetch and normalize JobKorea profile data.
   *
   * Uses BaseCrawler HTTP client with session cookies, retry/backoff,
   * CAPTCHA detection, and humanized delays.
   *
   * @returns {Promise<{success: boolean, data?: object, error?: string, code?: string}>}
   */
  async getProfile() {
    try {
      const cookieString = this.getCookieStringFromSession();
      if (!cookieString) {
        return {
          success: false,
          error: 'JobKorea session not found or expired',
          code: 'AUTH_REQUIRED',
        };
      }

      this.crawler.cookies = cookieString;
      this.logger.debug('[jobkorea-profile-sync] Session cookie loaded for profile fetch');

      const resumeUrl = JOBKOREA_URLS.resumeList;
      const profilePage = await this.fetchProfilePageWithRetry(resumeUrl);
      if (!profilePage.success) {
        return profilePage;
      }

      await this.humanDelay(1000, 3000);
      await this.randomViewportScroll();

      let htmlForExtraction = profilePage.html;
      const resumeDetailUrl = this.extractResumeDetailUrl(profilePage.html);

      if (resumeDetailUrl) {
        await this.humanDelay(1000, 3000);
        const detailPage = await this.fetchProfilePageWithRetry(resumeDetailUrl);
        if (detailPage.success) {
          htmlForExtraction = detailPage.html;
        } else {
          this.logger.debug(
            `[jobkorea-profile-sync] Failed detail page fetch, fallback to list page: ${detailPage.error}`
          );
        }
      }

      const rawProfile = this.extractRawProfile(htmlForExtraction, {
        sourceUrl: resumeDetailUrl || resumeUrl,
      });

      const normalized = this.normalizeProfile(rawProfile);
      this.logger.debug('[jobkorea-profile-sync] Profile extraction completed');

      return {
        success: true,
        data: normalized,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'PROFILE_FETCH_FAILED',
      };
    }
  }

  /**
   * Normalize raw JobKorea profile payload into SSoT-like schema.
   *
   * @param {object} rawData
   * @returns {object}
   */
  normalizeProfile(rawData) {
    const skills = Array.isArray(rawData.skills) ? rawData.skills.filter(Boolean) : [];

    return {
      personal: {
        name: rawData.basic?.name || '',
        email: rawData.basic?.email || '',
        phone: rawData.basic?.phone || '',
        birthDate: this.normalizeDate(rawData.basic?.birthdate) || '',
      },
      education: {
        school: rawData.education?.[0]?.school || '',
        major: rawData.education?.[0]?.major || '',
        degree: rawData.education?.[0]?.degree || '',
        graduationDate: this.normalizeDate(rawData.education?.[0]?.graduationDate) || null,
      },
      careers: (rawData.careers || []).map((career) => {
        const period = this.parseDateRange(career.period);
        return {
          company: career.company || '',
          role: career.position || '',
          description: career.description || '',
          period: career.period || '',
          startDate: period.start,
          endDate: period.end,
        };
      }),
      certifications: (rawData.certifications || []).map((cert) => ({
        name: cert.name || '',
        issuer: cert.issuer || '',
        date: this.normalizeDate(cert.date) || null,
      })),
      skills: {
        extracted: {
          title: 'Extracted Skills',
          icon: 'Code',
          items: skills.map((name) => ({
            name,
            level: 'intermediate',
            proficiency: 60,
          })),
        },
      },
      summary: {
        expertise: skills,
      },
      meta: {
        source: 'jobkorea',
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  getCookieStringFromSession() {
    const session = SessionManager.load('jobkorea');
    if (!session) return '';

    if (session.cookieString && typeof session.cookieString === 'string') {
      return session.cookieString;
    }

    if (Array.isArray(session.cookies)) {
      return session.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    }

    if (typeof session.cookies === 'string') {
      return session.cookies;
    }

    return '';
  }

  async fetchProfilePageWithRetry(url) {
    try {
      const response = await this.crawler.rateLimitedFetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          Referer: 'https://www.jobkorea.co.kr/',
        },
      });

      const finalUrl = response.url || url;
      if (this.isUnauthenticatedUrl(finalUrl)) {
        return {
          success: false,
          error: 'Redirected to login page. Authentication required.',
          code: 'AUTH_REQUIRED',
        };
      }

      const html = await response.text();

      const captcha = this.crawler.captchaDetector.detectInHtml(html, finalUrl);
      if (captcha) {
        this.logger.debug(
          `[jobkorea-profile-sync] CAPTCHA detected type=${captcha.type}, url=${captcha.url}`
        );
        if (this.crawler.captchaDetector.shouldPause()) {
          await this.crawler.sleep(30000);
        }
        return {
          success: false,
          error: 'CAPTCHA detected. Manual verification required.',
          code: 'CAPTCHA_DETECTED',
        };
      }

      return {
        success: true,
        html,
      };
    } catch (error) {
      this.logger.debug(`[jobkorea-profile-sync] fetch failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        code: 'TRANSIENT_FETCH_ERROR',
      };
    }
  }

  async humanDelay(minMs = 1000, maxMs = 3000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await this.crawler.sleep(delay);
  }

  async randomViewportScroll() {
    const offset = Math.floor(Math.random() * 2000) + 100;
    this.logger.debug(`[jobkorea-profile-sync] Simulated human scroll offset=${offset}px`);
    await this.humanDelay(200, 700);
  }

  isUnauthenticatedUrl(url = '') {
    return /\/login/i.test(url);
  }

  extractResumeDetailUrl(html = '') {
    const patterns = [
      /href=["']([^"']*\/User\/Resume\/(?:Edit|View)[^"']*)["']/i,
      /location\.href\s*=\s*["']([^"']*\/User\/Resume\/(?:Edit|View)[^"']*)["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const path = match[1];
        if (/^https?:\/\//i.test(path)) return path;
        return `https://www.jobkorea.co.kr${path.startsWith('/') ? '' : '/'}${path}`;
      }
    }

    return '';
  }

  extractRawProfile(html = '', meta = {}) {
    const cleanHtml = html.replace(/\n+/g, ' ');

    const basic = {
      name: this.extractFirst(cleanHtml, [
        /<input[^>]+name=["'](?:user)?name["'][^>]+value=["']([^"']+)["']/i,
        /["'](?:name|user_name)["']\s*:\s*["']([^"']+)["']/i,
        /<strong[^>]*class=["'][^"']*(?:name|user)[^"']*["'][^>]*>([^<]+)<\/strong>/i,
      ]),
      email: this.extractFirst(cleanHtml, [
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /<input[^>]+(?:name|id)=["'][^"']*(?:email|mail)[^"']*["'][^>]+value=["']([^"']+)["']/i,
      ]),
      phone: this.extractFirst(cleanHtml, [
        /(01[0-9]-?\d{3,4}-?\d{4})/i,
        /<input[^>]+(?:name|id)=["'][^"']*(?:phone|mobile|tel)[^"']*["'][^>]+value=["']([^"']+)["']/i,
      ]),
      birthdate: this.extractFirst(cleanHtml, [
        /((?:19\d{2}|20\d{2})[.\/-]\s?(?:1[0-2]|0?[1-9])[.\/-]\s?(?:3[01]|[12][0-9]|0?[1-9]))/,
      ]),
    };

    const education = this.extractSectionItems(cleanHtml, [
      /<li[^>]*class=["'][^"']*(?:education|edu|school)[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi,
      /<div[^>]*class=["'][^"']*(?:education|edu|school)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    ]).map((block) => ({
      school: this.extractFirst(block, [
        /(?:school|학교명?)\s*[:：]?\s*([^<\n,|]+?)(?=\s*(?:전공|major|학위|degree|\d{4}[.\/-]\d{1,2}|$))/i,
        /<span[^>]*class=["'][^"']*school[^"']*["'][^>]*>([^<]+)<\/span>/i,
      ]),
      major: this.extractFirst(block, [
        /(?:major|전공)\s*[:：]?\s*([^<\n,|]+?)(?=\s*(?:학위|degree|\d{4}[.\/-]\d{1,2}|$))/i,
        /<span[^>]*class=["'][^"']*major[^"']*["'][^>]*>([^<]+)<\/span>/i,
      ]),
      degree: this.extractFirst(block, [
        /(?:degree|학위)\s*[:：]?\s*([^<\n,|]+?)(?=\s*(?:\d{4}[.\/-]\d{1,2}|$))/i,
        /(학사|석사|박사|전문학사|고졸|대졸)/i,
      ]),
      graduationDate: this.extractFirst(block, [
        /((?:19\d{2}|20\d{2})[.\/-]\s?(?:1[0-2]|0?[1-9]))/,
      ]),
    }));

    const careers = this.extractSectionItems(cleanHtml, [
      /<li[^>]*class=["'][^"']*(?:career|experience|work)[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi,
      /<div[^>]*class=["'][^"']*(?:career|experience|work)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    ]).map((block) => ({
      company: this.extractFirst(block, [
        /(?:company|회사명?)\s*[:：]?\s*([^<\n|]+?)(?=\s*(?:직무|직책|position|role|\d{4}[.\/-]\d{1,2}|$))/i,
        /<span[^>]*class=["'][^"']*(?:company|corp)[^"']*["'][^>]*>([^<]+)<\/span>/i,
      ]),
      position: this.extractFirst(block, [
        /(?:position|role|직책|직무)\s*[:：]?\s*([^<\n|]+?)(?=\s*(?:\d{4}[.\/-]\d{1,2}|담당업무|description|$))/i,
        /<span[^>]*class=["'][^"']*(?:position|role|title)[^"']*["'][^>]*>([^<]+)<\/span>/i,
      ]),
      period: this.extractFirst(block, [
        /((?:19\d{2}|20\d{2})[.\/-]\s?(?:1[0-2]|0?[1-9])\s*[~\-]\s*(?:현재|(?:19\d{2}|20\d{2})[.\/-]\s?(?:1[0-2]|0?[1-9])))/,
      ]),
      description: this.extractFirst(block, [
        /<p[^>]*class=["'][^"']*(?:desc|description|detail)[^"']*["'][^>]*>([^<]+)<\/p>/i,
        /(?:description|업무|담당업무)\s*[:：]?\s*([^<\n]+)/i,
      ]),
    }));

    const certifications = this.extractSectionItems(cleanHtml, [
      /<li[^>]*class=["'][^"']*(?:cert|license)[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi,
      /<div[^>]*class=["'][^"']*(?:cert|license)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    ]).map((block) => ({
      name: this.extractFirst(block, [
        /(?:name|자격증명?)\s*[:：]?\s*([^<\n|]+?)(?=\s*(?:기관|issuer|발급처|date|\d{4}[.\/-]\d{1,2}|$))/i,
        /<span[^>]*class=["'][^"']*(?:name|cert)[^"']*["'][^>]*>([^<]+)<\/span>/i,
      ]),
      issuer: this.extractFirst(block, [
        /(?:issuer|기관|발급처)\s*[:：]?\s*([^<\n|]+?)(?=\s*(?:date|\d{4}[.\/-]\d{1,2}|$))/i,
        /<span[^>]*class=["'][^"']*(?:issuer|org|inst)[^"']*["'][^>]*>([^<]+)<\/span>/i,
      ]),
      date: this.extractFirst(block, [
        /((?:19\d{2}|20\d{2})[.\/-]\s?(?:1[0-2]|0?[1-9])(?:[.\/-]\s?(?:3[01]|[12][0-9]|0?[1-9]))?)/,
      ]),
    }));

    const skills = this.extractSkills(cleanHtml);

    return {
      basic,
      education: education.filter((item) => item.school || item.major || item.degree),
      careers: careers.filter((item) => item.company || item.position || item.period),
      skills,
      certifications: certifications.filter((item) => item.name || item.issuer || item.date),
      meta,
    };
  }

  extractSectionItems(html, patterns) {
    const items = [];
    for (const pattern of patterns) {
      let match = pattern.exec(html);
      while (match !== null) {
        if (match[1]) items.push(match[1]);
        match = pattern.exec(html);
      }
      if (items.length > 0) break;
    }
    return items;
  }

  extractSkills(html) {
    const skillSet = new Set();

    const skillBlock = this.extractFirst(html, [
      /<div[^>]*class=["'][^"']*(?:skill|tag)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /(?:보유기술|기술스택|skills?)\s*[:：]?\s*([^<\n]+)/i,
    ]);

    if (skillBlock) {
      const tokens = String(skillBlock)
        .replace(/<[^>]+>/g, ' ')
        .split(/[\s,|/]+/)
        .map((token) => token.trim())
        .filter(Boolean);

      for (const token of tokens) {
        if (token.length >= 2 && token.length <= 40) {
          skillSet.add(token);
        }
      }
    }

    const explicitSkills = this.extractSectionItems(html, [
      /<span[^>]*class=["'][^"']*(?:skill|tag)[^"']*["'][^>]*>([^<]+)<\/span>/gi,
      /<li[^>]*class=["'][^"']*(?:skill|tag)[^"']*["'][^>]*>([^<]+)<\/li>/gi,
    ]);

    for (const skill of explicitSkills) {
      const normalized = String(skill).trim();
      if (normalized) skillSet.add(normalized);
    }

    return [...skillSet];
  }

  extractFirst(text, regexes) {
    for (const regex of regexes) {
      const match = String(text).match(regex);
      if (match?.[1]) {
        return match[1]
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      if (match?.[0] && match.length > 1) {
        return match[0]
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    return '';
  }

  normalizeDate(dateLike) {
    if (!dateLike) return null;

    const normalized = String(dateLike).replace(/\s+/g, '');
    const ymd = normalized.match(
      /(19\d{2}|20\d{2})[.\/-]?(1[0-2]|0[1-9])[.\/-]?(3[01]|[12][0-9]|0[1-9])/
    );
    if (ymd) {
      return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
    }

    const ym = normalized.match(/(19\d{2}|20\d{2})[.\/-]?(1[0-2]|0[1-9])/);
    if (ym) {
      return `${ym[1]}-${ym[2]}-01`;
    }

    return null;
  }

  parseDateRange(period) {
    if (!period) return { start: null, end: null };

    const match = String(period).match(
      /(19\d{2}|20\d{2})[.\/-]?(1[0-2]|0[1-9])\s*[~\-]\s*(현재|(19\d{2}|20\d{2})[.\/-]?(1[0-2]|0[1-9]))/
    );

    if (!match) {
      return { start: null, end: null };
    }

    const start = `${match[1]}-${match[2]}-01`;
    const end = match[3] === '현재' ? null : `${match[4]}-${match[5]}-01`;
    return { start, end };
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
